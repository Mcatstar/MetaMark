<template>
  <div class="menu-bar" ref="menuBarRef" @click.stop>
    <div
      v-for="menu in menus"
      :key="menu.id"
      class="menu-bar-item"
      @click="toggleMenu(menu.id)"
      @mouseenter="hoverMenu(menu.id)"
    >
      <span class="menu-bar-label">{{ menu.label }}({{ menu.shortcut_key }})</span>
      <div v-if="activeMenu === menu.id" class="menu-dropdown" @mouseleave="closeSubmenu">
        <MenuItem
          v-for="item in menu.items"
          :key="item.id"
          :item="item"
          :active-submenu="activeSubmenu"
          @action="handleAction"
          @submenu="setSubmenu"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { MenuGroup } from '../types';
import menuConfig from '../config/menu-config.json';
import MenuItem from './MenuItem.vue';

const menus = menuConfig as MenuGroup[];
const activeMenu = ref<string | null>(null);
const activeSubmenu = ref<string | null>(null);
const menuBarRef = ref<HTMLElement | null>(null);

const emit = defineEmits<{
  'menu-action': [action: string];
}>();

function toggleMenu(id: string) {
  activeMenu.value = activeMenu.value === id ? null : id;
  activeSubmenu.value = null;
}

function hoverMenu(id: string) {
  if (activeMenu.value !== null) {
    activeMenu.value = id;
    activeSubmenu.value = null;
  }
}

function setSubmenu(id: string | null) {
  activeSubmenu.value = id;
}

function closeSubmenu() {
  activeSubmenu.value = null;
}

function handleAction(action: string) {
  activeMenu.value = null;
  activeSubmenu.value = null;
  emit('menu-action', action);
}

function closeAll() {
  activeMenu.value = null;
  activeSubmenu.value = null;
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeAll();
  }
}

function onClickOutside(e: MouseEvent) {
  if (menuBarRef.value && !menuBarRef.value.contains(e.target as Node)) {
    closeAll();
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('click', onClickOutside);
});
</script>

<style scoped>
.menu-bar {
  display: flex;
  align-items: center;
  height: 28px;
  background: #f5f5f5;
  border-bottom: 1px solid #d0d0d0;
  user-select: none;
  position: relative;
  z-index: 900;
}

.menu-bar-item {
  position: relative;
  padding: 0 10px;
  height: 100%;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.menu-bar-item:hover {
  background: #e8e8e8;
}

.menu-bar-label {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  min-width: 220px;
  padding: 4px 0;
  z-index: 1000;
}
</style>
