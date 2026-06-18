<template>
  <template v-if="item.separator">
    <hr class="menu-separator" />
  </template>
  <div
    v-else
    class="menu-item"
    :class="{
      'menu-item--disabled': item.disabled,
      'menu-item--has-children': !!(item.children && item.children.length > 0)
    }"
    @click.stop="onClick"
    @mouseenter="onMouseEnter"
  >
    <span class="menu-item-check">{{ item.checked ? '✓' : '' }}</span>
    <span class="menu-item-label">{{ item.label }}</span>
    <span v-if="item.shortcut" class="menu-item-shortcut">{{ item.shortcut }}</span>
    <span v-if="item.children && item.children.length > 0" class="menu-item-arrow">▸</span>
    <div
      v-if="item.children && item.children.length > 0 && activeSubmenu === item.id"
      class="menu-submenu"
      @mouseleave="$emit('submenu', null)"
    >
      <MenuItem
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :active-submenu="activeSubmenu"
        @action="(a: string) => $emit('action', a)"
        @submenu="(s: string | null) => $emit('submenu', s)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineOptions } from 'vue';
import type { MenuItem as MenuItemType } from '../types';

defineOptions({ name: 'MenuItem' });

const props = defineProps<{
  item: MenuItemType;
  activeSubmenu: string | null;
}>();

const emit = defineEmits<{
  action: [action: string];
  submenu: [id: string | null];
}>();

function onClick() {
  if (props.item.disabled) return;
  if (props.item.children && props.item.children.length > 0) {
    emit('submenu', props.activeSubmenu === props.item.id ? null : props.item.id);
    return;
  }
  if (props.item.action) {
    emit('action', props.item.action);
  }
}

function onMouseEnter() {
  if (props.item.children && props.item.children.length > 0 && !props.item.disabled) {
    emit('submenu', props.item.id);
  }
}
</script>

<style scoped>
.menu-separator {
  margin: 4px 8px;
  border: none;
  border-top: 1px solid #e0e0e0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 4px 24px 4px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  position: relative;
  white-space: nowrap;
  user-select: none;
}

.menu-item:hover {
  background: #e8f0fe;
}

.menu-item--disabled {
  color: #bdbdbd;
  pointer-events: none;
}

.menu-item--has-children {
  padding-right: 32px;
}

.menu-item-check {
  width: 18px;
  flex-shrink: 0;
  font-size: 12px;
  color: #1976d2;
}

.menu-item-label {
  flex: 1;
  min-width: 0;
}

.menu-item-shortcut {
  margin-left: 24px;
  color: #999;
  font-size: 12px;
}

.menu-item-arrow {
  position: absolute;
  right: 8px;
  font-size: 10px;
  color: #666;
}

.menu-submenu {
  position: absolute;
  left: 100%;
  top: -4px;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  min-width: 180px;
  padding: 4px 0;
  z-index: 1000;
}
</style>
