import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// 引入pinia状态管理
import {createPinia} from 'pinia'
// 引入路由，但是目前用不到
// import VueRouter from './router'
// import router from 'router'
// 引入element-plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const pinia=createPinia();
const app=createApp(App);

// pinia状态管理使用
app.use(pinia);
// elelment-plus使用
app.use(ElementPlus);
app.mount('#app')