import { createRouter, createWebHistory } from 'vue-router'
import Contact from '@/views/Contact.vue'
import CreateProject from '@/views/CreateProject.vue'
import ProjectStatus from '@/views/ProjectStatus.vue'
import Assembling from '@/views/Assembling.vue'
import MyProjects from '@/views/MyProjects.vue'
import Library from '@/views/Library.vue'
import Settings from '@/views/Settings.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
import AuthCallback from '@/views/AuthCallback.vue'
import BugReportFeed from '@/views/BugReportFeed.vue'
import PostDetail from '@/views/PostDetail.vue'
import CreateBugReport from '@/views/CreateBugReport.vue'
import EditBugReport from '@/views/EditBugReport.vue'
import PublicProfile from '@/views/PublicProfile.vue'
import Onboarding from '@/views/Onboarding.vue'
import AdminLogin from '@/views/AdminLogin.vue'
import AdminBuilds from '@/views/AdminBuilds.vue'
import { authState, validateSession } from '@/services/api'
import { getAdminToken } from '@/services/admin-api'

const LOGIN_PATH = '/login'
const REGISTER_PATH = '/register'

let sessionValidated = false
async function ensureSessionValidated() {
    if (sessionValidated) return
    await validateSession()
    sessionValidated = true
}

const isAuthenticated = () => authState.isSignedIn()

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: LOGIN_PATH,
            name: 'login',
            component: Login,
            meta: { public: true, hideSidebar: true }
        },
        {
            path: REGISTER_PATH,
            name: 'register',
            component: Register,
            meta: { public: true, hideSidebar: true }
        },
        {
            // Federated sign-in redirect target: consumes #access/#refresh (or #error).
            path: '/auth/callback',
            name: 'auth-callback',
            component: AuthCallback,
            meta: { public: true, hideSidebar: true }
        },
        // NOTE: '/' is NOT an SPA route. The marketing landing page is a static
        // index.html served by serve.ts; in-app links to it must be plain <a href="/">.
        {
            path: '/contact',
            name: 'contact',
            component: Contact,
            meta: { public: true, hideSidebar: true }
        },
        {
            path: '/build',
            name: 'create-project',
            component: CreateProject,
            meta: { requiresAuth: true }
        },
        {
            path: '/projects',
            name: 'my-projects',
            component: MyProjects,
            meta: { requiresAuth: true }
        },
        {
            path: '/library',
            name: 'library',
            component: Library,
            meta: { requiresAuth: true }
        },
        {
            path: '/settings',
            name: 'settings',
            component: Settings,
            meta: { requiresAuth: true }
        },
        {
            path: '/project/:id',
            name: 'project-status',
            component: ProjectStatus,
            props: true,
            meta: { requiresAuth: true }
        },
        {
            path: '/project/:id/assembling',
            name: 'project-assembling',
            component: Assembling,
            props: true,
            meta: { requiresAuth: true }
        },
        {
            path: '/posts',
            name: 'bug-report-feed',
            component: BugReportFeed,
            meta: { public: true }
        },
        {
            path: '/posts/new',
            name: 'create-bug-report',
            component: CreateBugReport,
            meta: { requiresAuth: true }
        },
        {
            path: '/posts/:postId',
            name: 'post-detail',
            component: PostDetail,
            props: true,
            meta: { public: true }
        },
        {
            path: '/posts/:postId/edit',
            name: 'edit-bug-report',
            component: EditBugReport,
            props: true,
            meta: { requiresAuth: true }
        },
        {
            path: '/profiles/:username',
            name: 'public-profile',
            component: PublicProfile,
            props: true,
            meta: { public: true }
        },
        {
            path: '/onboarding',
            name: 'onboarding',
            component: Onboarding,
            meta: { requiresAuth: true }
        },
        // Operator observatory (W7). Server-side the /admin API re-gates every
        // request on AdminAuthenticating._isAdmin — these client guards are UX,
        // not security.
        {
            path: '/admin',
            name: 'admin-login',
            component: AdminLogin,
            meta: { public: true, hideSidebar: true }
        },
        {
            path: '/admin/builds',
            name: 'admin-builds',
            component: AdminBuilds,
            meta: { public: true, hideSidebar: true, requiresAdminToken: true }
        }
    ]
})

router.beforeEach(async (to, _from, next) => {
    const requiresAuth = to.matched.some((r) => r.meta?.requiresAuth)
    const isPublic = to.matched.some((r) => r.meta?.public)

    // Admin observatory: EITHER an admin-realm token (password login at /admin)
    // OR a normal signed-in session (password/Google/GitHub) is enough to attempt
    // the route. An allowlisted operator is entitled via their ordinary session
    // (admin_allowlist.sync.ts promotes them at login), and the server re-gates
    // every /admin request on AdminAuthenticating._isAdmin regardless — so
    // bouncing a signed-in operator to the admin password form here was purely a
    // client-side false negative. Non-admins still get 403 from the API.
    if (
        to.matched.some((r) => r.meta?.requiresAdminToken) &&
        !getAdminToken() && !isAuthenticated()
    ) {
        return next('/admin')
    }

    // Validate session before allowing access to protected routes
    if (requiresAuth) {
        await ensureSessionValidated()
    }

    const authenticated = isAuthenticated()

    if (isPublic && authenticated && (to.path === LOGIN_PATH || to.path === REGISTER_PATH)) {
        return next('/build')
    }
    if (requiresAuth && !authenticated) {
        return next({ path: LOGIN_PATH, query: { redirect: to.fullPath } })
    }
    next()
})

export default router
