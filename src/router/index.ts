import { createRouter, createWebHashHistory } from 'vue-router'
import { useDraftGuardStore } from '@/stores/draftGuard'
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('@/views/ShelfView.vue') },
    { path: '/works/:id(\\d+)', component: () => import('@/views/WorkView.vue') },
    { path: '/authors', component: () => import('@/views/AuthorsView.vue') },
    { path: '/authors/:id(\\d+)', component: () => import('@/views/AuthorsView.vue') },
    { path: '/libraries', component: () => import('@/views/LibrariesView.vue') },
    { path: '/history', component: () => import('@/views/HistoryView.vue') },
    { path: '/my-uploads', component: () => import('@/views/MyUploadsView.vue') },
    { path: '/contributions', component: () => import('@/views/ContributionsView.vue') },
    { path: '/statistics', component: () => import('@/views/StatisticsView.vue') },
    { path: '/inbox', component: () => import('@/views/InboxView.vue') },
    { path: '/members', component: () => import('@/views/MembersView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: (to, from, savedPosition) =>
    savedPosition || (to.path === from.path ? false : { top: 0 }),
})
router.beforeEach((to, from) => (to.path !== from.path ? useDraftGuardStore().confirm() : true))
export default router
