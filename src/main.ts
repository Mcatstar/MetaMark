import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import 'highlight.js/styles/vs2015.min.css';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
