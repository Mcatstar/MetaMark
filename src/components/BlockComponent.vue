<template>
  <div class="block" @dblclick="startEdit">
    <div v-if="!block.editing" class="preview" v-html="renderedBlock"></div>
    <textarea v-else ref="input" v-model="block.raw" @blur="save" @keydown.ctrl.enter="save" class="edit-area"></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { md } from '../markdown';

const props = defineProps<{ block: { raw: string, editing: boolean } }>();
const emit = defineEmits(['update']);

const input = ref<HTMLTextAreaElement | null>(null);

const renderedBlock = computed(() => md.render(props.block.raw));

function startEdit() {
  // 通知父组件关闭其他块编辑状态
  // 这里直接修改 block.editing，但需确保响应式
  props.block.editing = true;
  nextTick(() => {
    input.value?.focus();
    input.value?.select();
  });
}

function save() {
  props.block.editing = false;
  emit('update', props.block.raw);
}
</script>

<style scoped>
.block { margin: 4px 0; }
.preview { padding: 2px 8px; border-radius: 4px; cursor: text; }
.preview:hover { background: #f0f4ff; }
.edit-area { width: 100%; padding: 4px 8px; font-family: monospace; border: 2px solid #007aff; border-radius: 4px; }
</style>