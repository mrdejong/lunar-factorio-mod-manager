import {ProfilesContainer} from './components/Profiles/Profiles'
import {InstalledModsContainer} from './components/InstalledMods/InstalledMods'
import {OnlineMods} from './components/OnlineMods/OnlineMods'
import {AboutContainer} from './components/About/About'

export const routes = [
  {
    name: 'Profiles',
    pathname: '/',
    component: ProfilesContainer
  },
  {
    name: 'Installed Mods',
    pathname: '/installedMods',
    component: InstalledModsContainer
  },
  {
    name: 'Online Mods',
    pathname: '/onlineMods',
    component: OnlineMods
  },
  {
    name: 'About',
    pathname: '/about',
    component: AboutContainer
  }
]
