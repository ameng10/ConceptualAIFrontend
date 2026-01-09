import { createRouter, createWebHistory } from 'vue-router'
import CreateProject from '@/views/CreateProject.vue'
import ProjectStatus from '@/views/ProjectStatus.vue'
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
        }
    ]
})

export default router
