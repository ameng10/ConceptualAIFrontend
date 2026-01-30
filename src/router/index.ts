import { createRouter, createWebHistory } from 'vue-router'
import CreateProject from '@/views/CreateProject.vue'
import ProjectStatus from '@/views/ProjectStatus.vue'
import Implementing from '@/views/Implementing.vue'
import Syncing from '@/views/Syncing.vue'
import Assembling from '@/views/Assembling.vue'
import MyProjects from '@/views/MyProjects.vue'
import Library from '@/views/Library.vue'
import Settings from '@/views/Settings.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'create-project',
            component: CreateProject
        },
        {
            path: '/projects',
            name: 'my-projects',
            component: MyProjects
        },
        {
            path: '/library',
            name: 'library',
            component: Library
        },
        {
            path: '/settings',
            name: 'settings',
            component: Settings
        },
        {
            path: '/project/:id',
            name: 'project-status',
            component: ProjectStatus,
            props: true
        },
        {
            path: '/project/:id/implementing',
            name: 'project-implementing',
            component: Implementing,
            props: true
        },
        {
            path: '/project/:id/syncing',
            name: 'project-syncing',
            component: Syncing,
            props: true
        },
        {
            path: '/project/:id/assembling',
            name: 'project-assembling',
            component: Assembling,
            props: true
        }
    ]
})

export default router
