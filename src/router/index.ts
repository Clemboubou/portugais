import { createRouter, createWebHistory } from 'vue-router'

// Import view components
const Dashboard = () => import('../views/Dashboard.vue')
const LessonsList = () => import('../views/LessonsList.vue')
const LessonDetail = () => import('../views/LessonDetail.vue')
const FlashcardView = () => import('../views/Flashcards.vue')
const QuizView = () => import('../views/Quiz.vue')
const ResourcesView = () => import('../views/ResourcesView.vue')
const ImportView = () => import('../views/ImportView.vue')

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/lessons',
    name: 'Lessons',
    component: LessonsList
  },
  {
    path: '/lesson/:id',
    name: 'LessonDetail',
    component: LessonDetail,
    props: route => ({ id: Number(route.params.id) })
  },
  {
    path: '/flashcards',
    name: 'Flashcards',
    component: FlashcardView
  },
  {
    path: '/flashcards/:moduleId',
    name: 'FlashcardsModule',
    component: FlashcardView,
    props: route => ({ moduleId: Number(route.params.moduleId) })
  },
  {
    path: '/quiz/:moduleId',
    name: 'Quiz',
    component: QuizView,
    props: route => ({ moduleId: Number(route.params.moduleId) })
  },
  {
    path: '/resources',
    name: 'Resources',
    component: ResourcesView
  },
  {
    path: '/import',
    name: 'Import',
    component: ImportView
  },
  // Redirect any unknown routes to the dashboard
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
