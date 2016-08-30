const helpers = require('./helpers.js');
module.exports = {
    Manager: ModManager
};
//---------------------------------------------------------
// Primary class declaration

// TODO: Make mods be ready before this so they can be provided in constructor
function ModManager(modListPath, modDirectoryPath, gamePath, customEvents) {

    this.modListPath = modListPath;
    this.modDirectoryPath = modDirectoryPath;
    this.gamePath = gamePath;
    this.installedMods = [];
    this.onlineMods = [];

    this.customEvents = customEvents;
    this.modsLoaded = false;

    this.playerUsername = '';
    this.playerToken = '';

    this.loadPlayerData();
    this.loadInstalledMods();
    this.loadOnlineMods();
}

//---------------------------------------------------------
// Sending data to the client

ModManager.prototype.sendInstalledMods = function(window) {
    window.webContents.send('dataInstalledMods', this.getInstalledModNames());
};

ModManager.prototype.sendInstalledModInfo = function(window, modName) {

    let mods = this.installedMods;
    for(let i = mods.length - 1; i >= 0; i--) {
        if(mods[i]['name'] === modName) {
            window.webContents.send('dataInstalledModInfo', mods[i]);
            break;
        }
    }
};

ModManager.prototype.sendOnlineMods = function(window) {
   window.webContents.send('dataOnlineMods', this.onlineMods);
}

ModManager.prototype.sendOnlineModInfo = function(window, modName) {

    let mods = this.onlineMods;
    for(let i = mods.length - 1; i >= 0; i--) {
       if(mods[i]['name'] === modName) {
           window.webContents.send('dataOnlineModInfo', mods[i]);
           break;
       }
    }
};

ModManager.prototype.sendModLoadStatus = function(window) {
    window.webContents.send('modsLoadedStatus', this.modsLoaded);
}

//---------------------------------------------------------
// File Management

ModManager.prototype.loadInstalledMods = function() {
    let file = require('fs');
    let JSZip = require('jszip');

    let modZipNames = file.readdirSync(this.modDirectoryPath, 'utf8');
    modZipNames.splice(modZipNames.indexOf('mod-list.json'), 1);

    this.installedMods = [];
    let mods = this.installedMods;
    let events = this.customEvents;

    // Add base mod
    let gamePath = this.gamePath;
    let baseInfo = `${gamePath.substr(0, gamePath.lastIndexOf('Factorio\\bin'))}Factorio/data/base/info.json`;
    mods.push(JSON.parse(file.readFileSync(baseInfo, 'utf8')));

    let counter = modZipNames.length;
    for(let i = 0; i < modZipNames.length; i++) {
        // Open the zip file as a buffer
        file.readFile(`${this.modDirectoryPath}${modZipNames[i]}`, function(error, rawZipBuffer) {
            if(error) throw error;

            // Actually read the zip file
            JSZip.loadAsync(rawZipBuffer).then(function(zip) {
                // Only open the mods info file in the zip
                return zip.file(/info\.json/)[0].async('text');

            }).then(function(modData) {
                // Save the information
                mods.push(JSON.parse(modData));

                // Only show once all zip files have been read
                counter--;
                if(counter <= 0) {
                    mods = helpers.sortArrayByProp(mods, 'name');
                    events.emit('installedModsLoaded');
                }
            });
        });
    }
};

ModManager.prototype.loadPlayerData = function() {
    let file = require('fs');

    let configPath = `${this.modDirectoryPath}/../config/player-data.json`;

    let data = file.readFileSync(configPath, 'utf8');
    data = JSON.parse(data);

    if('service-username' in data && 'service-token' in data) {
        this.playerUsername = data['service-username'];
        this.playerToken = data['service-token'];
    }
};

//---------------------------------------------------------
// Online Mod Management

// window is an optional argument, if given will send data once loaded
ModManager.prototype.loadOnlineMods = function() {

    let request = require('request');
    let mods = this.onlineMods;
    let events = this.customEvents;

    let apiURL = 'https://mods.factorio.com/api/mods';
    let options = '?page_size=20';


    getOnlineModData(`${apiURL}${options}`, () => {
        this.modsLoaded = true;
        events.emit('onlineModsLoaded', true);
    });

    function getOnlineModData(url, callback) {

       request(url ,function(error, response, data) {
           if(!error && response.statusCode == 200) {
               data = JSON.parse(data);

               let page = data.pagination.page;
               let pageCount = data.pagination.page_count;
               events.emit('onlineModsLoaded', false, page, pageCount);

               for(let i = 0; i < data['results'].length; i++) {
                   mods.push(data['results'][i]);
               }

               if(data['pagination']['links']['next']) {
                   getOnlineModData(data['pagination']['links']['next'], callback);
               }
               else {
                   callback();
               }
           }
           else {
               throw error;
           }

       });
    }
};

ModManager.prototype.initiateDownload = function(window, modID) {
    if(!this.playerUsername || !this.playerToken) {
        return;
    }

    let mods = this.onlineMods;
    let modToDownload;

    for(let i = mods.length - 1; i >= 0; i--) {
       if(mods[i]['id'] == modID) {
           window.webContents.send('ping', mods[i]);
           modToDownload = mods[i];
           break;
       }
    }
    window.webContents.send('ping', modToDownload);

    helpers.log(`Attempting to download mod: ${modToDownload['name']}`);
    let downloadURL = `https://mods.factorio.com${modToDownload['latest_release']['download_url']}`;
    downloadURL += `?username=${this.playerUsername}&token=${this.playerToken}`;
    window.webContents.send('ping', downloadURL);

    window.webContents.downloadURL(downloadURL);
};

ModManager.prototype.manageDownload = function(item, webContents, profileManager) {
   // Set the save path, making Electron not to prompt a save dialog.
   item.setSavePath(`${this.modDirectoryPath}${item.getFilename()}`);

   item.once('done', (event, state) => {
       if (state === 'completed') {
           helpers.log('Downloaded mod successfully');
           this.loadInstalledMods();
           profileManager.updateProfilesWithNewMods(this.getInstalledModNames());
       } else {
           helpers.log(`Download failed: ${state}`);
       }
   });
};

//---------------------------------------------------------
// Helper and Miscellaneous Logic

ModManager.prototype.getFactorioModList = function() {
    helpers.log('Checking for mod list at path: ' + this.modListPath);
    let file = require('fs');

    let data = file.readFileSync(this.modListPath, 'utf8');
    return JSON.parse(data)['mods'];
};

ModManager.prototype.getInstalledModNames = function() {

    return this.installedMods.map(function(mod) {
       return mod['name'];
    });
};