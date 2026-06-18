<template>
  <div v-if="page_store.show_settings" class="dialog-overlay" @click.self="close">
    <div class="dialog-panel">
      <h3 class="dialog-title">页面设置</h3>

      <div class="dialog-section">
        <label class="dialog-label">纸张尺寸</label>
        <select v-model="selectedPreset" @change="onPresetChange" class="dialog-select">
          <option v-for="(p, i) in PAPER_PRESETS" :key="i" :value="i">{{ p.label }}</option>
          <option value="-1">自定义</option>
        </select>
        <div v-if="selectedPreset === -1" class="custom-size">
          <input type="number" v-model.number="customWidth" class="dialog-input" /> x
          <input type="number" v-model.number="customHeight" class="dialog-input" />
          <select v-model="sizeUnit" class="dialog-select">
            <option value="mm">mm</option>
            <option value="inch">英寸</option>
          </select>
        </div>
      </div>

      <div class="dialog-section">
        <label class="dialog-label">页边距</label>
        <div class="margin-inputs">
          <div class="margin-field">
            <span class="margin-label">上</span>
            <input type="number" v-model.number="page_store.config.margins.top" class="dialog-input small" /> mm
          </div>
          <div class="margin-field">
            <span class="margin-label">下</span>
            <input type="number" v-model.number="page_store.config.margins.bottom" class="dialog-input small" /> mm
          </div>
          <div class="margin-field">
            <span class="margin-label">左</span>
            <input type="number" v-model.number="page_store.config.margins.left" class="dialog-input small" /> mm
          </div>
          <div class="margin-field">
            <span class="margin-label">右</span>
            <input type="number" v-model.number="page_store.config.margins.right" class="dialog-input small" /> mm
          </div>
        </div>
        <div class="margin-presets">
          <button @click="page_store.apply_preset('standard')" class="btn-preset">标准</button>
          <button @click="page_store.apply_preset('narrow')" class="btn-preset">窄</button>
          <button @click="page_store.apply_preset('wide')" class="btn-preset">宽</button>
        </div>
      </div>

      <div class="dialog-section">
        <label class="checkbox-label">
          <input type="checkbox" v-model="page_store.config.show_page_break" class="dialog-checkbox" />
          显示分页分割线
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="page_store.config.double_page" class="dialog-checkbox" />
          双页并排预览
        </label>
      </div>

      <div class="dialog-actions">
        <button @click="page_store.reset_config()" class="btn-secondary">重置</button>
        <button @click="close" class="btn-primary">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { usePageStore } from '../store/page-store';
import { PAPER_PRESETS } from '../utils/page-layout';

const page_store = usePageStore();

const selectedPreset = ref(0);
const customWidth = ref(PAPER_PRESETS[0].width_mm);
const customHeight = ref(PAPER_PRESETS[0].height_mm);
const sizeUnit = ref<'mm' | 'inch'>('mm');

watch(() => page_store.show_settings, (val) => {
  if (val) {
    const size = page_store.config.size;
    const presetIdx = PAPER_PRESETS.findIndex(
      p => p.width_mm === size.width && p.height_mm === size.height
    );
    selectedPreset.value = presetIdx >= 0 ? presetIdx : -1;
    if (presetIdx >= 0) {
      customWidth.value = PAPER_PRESETS[presetIdx].width_mm;
      customHeight.value = PAPER_PRESETS[presetIdx].height_mm;
    } else {
      customWidth.value = size.unit === 'inch' ? size.width * 25.4 : size.width;
      customHeight.value = size.unit === 'inch' ? size.height * 25.4 : size.height;
    }
    sizeUnit.value = size.unit;
  }
});

function onPresetChange() {
  const idx = Number(selectedPreset.value);
  if (idx >= 0) {
    page_store.set_paper(idx, sizeUnit.value);
    customWidth.value = PAPER_PRESETS[idx].width_mm;
    customHeight.value = PAPER_PRESETS[idx].height_mm;
  }
}

watch([customWidth, customHeight, sizeUnit], () => {
  if (selectedPreset.value === -1 && customWidth.value > 0 && customHeight.value > 0) {
    page_store.set_custom_size(customWidth.value, customHeight.value, sizeUnit.value);
  }
});

function close() {
  page_store.show_settings = false;
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog-panel {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 440px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 24px 28px;
}

.dialog-title {
  margin: 0 0 20px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.dialog-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.dialog-section:last-of-type {
  border-bottom: none;
}

.dialog-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #555;
  margin-bottom: 8px;
}

.dialog-select {
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  color: #333;
  outline: none;
}

.dialog-input {
  width: 72px;
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  outline: none;
  color: #333;
  box-sizing: border-box;
}

.dialog-input:focus {
  border-color: #1976d2;
}

.dialog-input.small {
  width: 60px;
}

.custom-size {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.margin-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  margin-bottom: 8px;
}

.margin-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.margin-label {
  font-size: 12px;
  color: #888;
  min-width: 14px;
}

.margin-presets {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.btn-preset {
  padding: 3px 12px;
  font-size: 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fafafa;
  cursor: pointer;
  color: #333;
}

.btn-preset:hover {
  background: #e8e8e8;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #333;
  margin-bottom: 6px;
  cursor: pointer;
}

.dialog-checkbox {
  accent-color: #1976d2;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.btn-secondary,
.btn-primary {
  padding: 6px 20px;
  font-size: 13px;
  border-radius: 4px;
  border: 1px solid #d0d0d0;
  cursor: pointer;
}

.btn-secondary {
  background: #fafafa;
  color: #333;
}

.btn-secondary:hover {
  background: #e8e8e8;
}

.btn-primary {
  background: #1976d2;
  color: #fff;
  border-color: #1976d2;
}

.btn-primary:hover {
  background: #1565c0;
}
</style>
