<template>
  <a-card title="状态面板" :bordered="false" class="status-panel-card">
    <a-descriptions
      size="small"
      bordered
      :column="1"
      style="margin-bottom: 12px"
    >
      <a-descriptions-item label="阶段">{{ phaseText }}</a-descriptions-item>

      <a-descriptions-item label="当前轮次">{{
        store.workflow.currentRound
      }}</a-descriptions-item>
      <a-descriptions-item label="连续未标注不太准确轮数">{{
        store.workflow.roundsWithoutElimination
      }}</a-descriptions-item>
    </a-descriptions>

    <a-descriptions
      size="small"
      bordered
      :column="1"
      style="margin-bottom: 12px"
    >
      <a-descriptions-item label="患者姓名">{{
        store.patientCase.name || "—"
      }}</a-descriptions-item>
      <a-descriptions-item label="年龄">{{
        store.patientCase.age ?? "—"
      }}</a-descriptions-item>
      <a-descriptions-item label="既往疾病">
        <ExpandableText :text="store.patientCase.pastHistory || '—'" />
      </a-descriptions-item>
      <a-descriptions-item label="本次问题">
        <ExpandableText :text="store.patientCase.currentProblem || '—'" />
      </a-descriptions-item>
      <a-descriptions-item v-if="hasImageRecognitions" label="图片识别结果">
        <ExpandableText :text="store.patientCase.imageRecognitionResult || '—'" />
      </a-descriptions-item>
    </a-descriptions>

    <DoctorList :doctors="store.doctors" />

    <template v-if="store.workflow.phase === 'voting'">
      <div style="margin-top: 16px">
        <VoteTally :doctors="store.doctors" :votes="store.lastRoundVotes" />
      </div>
    </template>

    <template v-if="store.workflow.phase === 'finished'">
      <div style="margin-top: 16px">
        <a-alert
          type="success"
          show-icon
          message="会诊已结束"
          :description="winnerText"
        />
        <div
          style="margin-top: 12px; display: flex; align-items: center; gap: 8px"
        >
          <a-button
            type="primary"
            :disabled="store.finalSummary.status !== 'ready'"
            @click="summaryOpen = true"
            >查看最终答案</a-button
          >
          <a-tag
            v-if="store.finalSummary.status === 'pending'"
            color="processing"
            >最终答案生成中...</a-tag
          >
          <a-tag
            v-else-if="store.finalSummary.status === 'ready'"
            color="success"
            >最终答案已生成 · {{ store.finalSummary.doctorName }}</a-tag
          >
          <a-tag v-else-if="store.finalSummary.status === 'error'" color="error"
            >最终答案生成失败</a-tag
          >
        </div>
      </div>
    </template>

    <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap">
      <a-button @click="$emit('open-settings')" :disabled="isExportingSession">问诊设置</a-button>
      <a-button @click="exportCurrentSessionAsPDF" :loading="isExportingSession" :disabled="isExportingSession">📄 导出 PDF</a-button>
      <a-button @click="exportCurrentSessionAsImage" :loading="isExportingSession" :disabled="isExportingSession">🖼️ 导出图片</a-button>
      <a-popconfirm title="确认重置流程？" @confirm="resetAll" :disabled="isExportingSession">
        <a-button danger :disabled="isExportingSession">重置</a-button>
      </a-popconfirm>
    </div>
  </a-card>
  <a-modal
    v-model:open="summaryOpen"
    title="最终答案"
    width="900px"
    :footer="null"
  >
    <div v-if="store.finalSummary.status === 'ready'">
      <div style="display: flex; justify-content: flex-end; margin-bottom: 8px">
        <a-button type="dashed" size="small" @click="exportSummaryImage"
          >导出图片</a-button
        >
      </div>
      <div ref="exportRef" class="final-card">
        <div class="final-card-header">
          <div class="final-title">🎯 最终答案</div>
          <div class="final-sub">
            由 {{ store.finalSummary.doctorName }} 生成
          </div>
        </div>
        <a-alert
          type="warning"
          show-icon
          message="【本内容仅供参考，身体不适尽早就医】"
          style="margin-bottom: 12px;"
        />
        <div class="case-brief">
          <div>患者姓名：{{ store.patientCase.name || "—" }}</div>
          <div>年龄：{{ store.patientCase.age ?? "—" }}</div>
          <div>既往疾病：{{ store.patientCase.pastHistory || "—" }}</div>
          <div>本次问题：{{ store.patientCase.currentProblem || "—" }}</div>
          <div v-if="store.patientCase.imageRecognitionResult">图片识别结果：{{ store.patientCase.imageRecognitionResult }}</div>
        </div>
        <div
          v-html="renderMarkdown(store.finalSummary.content)"
          class="final-summary-md"
        ></div>
      </div>
    </div>
    <div v-else-if="store.finalSummary.status === 'pending'">
      <a-spin tip="最终答案生成中..." />
    </div>
    <div v-else-if="store.finalSummary.status === 'error'">
      <a-alert type="error" :message="store.finalSummary.content" />
    </div>
  </a-modal>
</template>

<script setup>
import { computed, ref } from "vue";
import { renderSafeMarkdown } from '../utils/safeMarkdown.js'
import { message } from "ant-design-vue";

import { useConsultStore } from "../store";
import { useSessionsStore } from "../store/sessions";
import DoctorList from "./DoctorList.vue";
import VoteTally from "./VoteTally.vue";
import ExpandableText from "./ExpandableText.vue";
import { exportSessionAsPDF, exportSessionAsImage } from "../utils/exportSession";

const store = useConsultStore();
const sessions = useSessionsStore();
const summaryOpen = ref(false);
const exportRef = ref(null);
const isExportingSession = ref(false);

const imageRecognitions = computed(() => store.patientCase?.imageRecognitions || []);
const hasImageRecognitions = computed(() => (imageRecognitions.value && imageRecognitions.value.length > 0) || !!store.patientCase?.imageRecognitionResult);

const phaseText = computed(() => {
  switch (store.workflow.phase) {
    case "setup":
      return "配置/准备";
    case "discussion":
      return "讨论中";
    case "voting":
      return "评估中";
    case "finished":
      return "已结束";
    default:
      return store.workflow.phase;
  }
});

const winnerText = computed(() => {
  const actives = store.doctors.filter((d) => d.status === "active");
  if (actives.length === 1) return `最终答案来自：${actives[0].name}`;
  return "已达到未标注不太准确轮数上限";
});

function renderMarkdown(text) {
  try {
    return renderSafeMarkdown(text || "");
  } catch (e) {
    return renderSafeMarkdown(String(text ?? ''))
  }
}

async function exportSummaryImage() {
  const node = exportRef.value;
  if (!node) return;
  try {
    const dataUrl = await window.htmlToImage.toPng(node, { pixelRatio: 2, cacheBust: true });
    const a = document.createElement("a");
    const fileBase = store.patientCase?.name
      ? `${store.patientCase.name}-最终答案`
      : "最终答案";
    a.href = dataUrl;
    a.download = `${fileBase}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    // ignore
    console.error(e);
  }
}

async function exportCurrentSessionAsPDF() {
  try {
    isExportingSession.value = true
    const sessionData = sessions.getSessionData(sessions.currentId)
    const meta = sessions.current
    
    if (!sessionData) {
      message.error('会诊数据不存在')
      return
    }
    
    const fileName = `${meta?.name || '会诊报告'}.pdf`
    await exportSessionAsPDF(meta, sessionData, fileName)
    message.success('PDF 导出成功')
  } catch (error) {
    console.error('Export PDF error:', error)
    message.error('导出 PDF 失败：' + (error?.message || '未知错误'))
  } finally {
    isExportingSession.value = false
  }
}

async function exportCurrentSessionAsImage() {
  try {
    isExportingSession.value = true
    const sessionData = sessions.getSessionData(sessions.currentId)
    const meta = sessions.current
    
    if (!sessionData) {
      message.error('会诊数据不存在')
      return
    }
    
    const fileName = `${meta?.name || '会诊报告'}.png`
    await exportSessionAsImage(meta, sessionData, fileName)
    message.success('图片导出成功')
  } catch (error) {
    console.error('Export image error:', error)
    message.error('导出图片失败：' + (error?.message || '未知错误'))
  } finally {
    isExportingSession.value = false
  }
}

function resetAll() {
  // 重置流程并恢复所有医生为在席
  store.workflow = {
    phase: "setup",
    currentRound: 0,
    roundsWithoutElimination: 0,
    activeTurn: null,
    turnQueue: [],
    paused: false,
  };
  store.doctors = store.doctors.map((d) => ({
    ...d,
    status: "active",
    votes: 0,
  }));
  store.discussionHistory = [];
  store.lastRoundVotes = [];
  store.patientCase = {
    name: "",
    age: null,
    pastHistory: "",
    currentProblem: "",
    imageRecognitionResult: "",
    imageRecognitions: [],
  };
  store.finalSummary = {
    status: "idle",
    doctorId: null,
    doctorName: "",
    content: "",
    usedPrompt: "",
  };
}
</script>

<style scoped>
.final-summary-md :deep(h1),
.final-summary-md :deep(h2),
.final-summary-md :deep(h3) {
  margin: 12px 0 8px;
}
.final-summary-md :deep(p) {
  margin: 0 0 8px;
}
.final-summary-md :deep(ul),
.final-summary-md :deep(ol) {
  padding-left: 20px;
  margin: 0 0 8px;
}

.final-card {
  background: #ffffff;
  border: 1px solid #e6f4ff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}
.final-card-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}
.final-title {
  font-size: 20px;
  font-weight: 700;
  color: #0958d9;
}
.final-sub {
  color: #8c8c8c;
  font-size: 12px;
}
.case-brief {
  background: #f5f5f5;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  color: #595959;
  font-size: 13px;
}

.status-panel-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.status-panel-card :deep(.ant-card-body) {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.status-panel-card :deep(.ant-card-body) {
  scrollbar-width: thin;
}

.status-panel-card :deep(.ant-card-body::-webkit-scrollbar) {
  width: 6px;
}
</style>
