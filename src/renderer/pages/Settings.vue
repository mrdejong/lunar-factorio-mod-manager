<template>
    <div>
        <h1>Settings</h1>

        <div
            v-for="setting in settings"
            :key="setting.title"
            >
            <label>{{ setting.title }}</label>
            <Input :setting="setting" />

            <input
                type="checkbox"
                v-if="setting.type === 'boolean'"
                :value="store.get(setting.key)"
                />
            <input
                type="file"
                v-if="setting.type === 'file'"
                />
        </div>
    </div>
</template>

<script>
import settings from '../../main/lib/settings'
import store from '../../main/lib/store'
import Input from '../components/Input'

export default {
    name: 'Settings',
    components: {
        Input
    },
    data: () => {
        return {
            settings,
            store
        }
    }
}
</script>

<style lang="scss" scoped>
</style>
