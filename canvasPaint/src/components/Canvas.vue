<template>
  <el-container>
    <el-header>
      <div class="header-left">
        <el-button type="primary" size="default" @click="selectFiles">选择文件</el-button>
      </div>
      <div class="header-center">
        <el-button type="primary" size="default" @click="undo">撤销</el-button>
        <el-button type="primary" size="default" @click="toggleGrid">切换网格</el-button>
        <el-button type="primary" size="default" @click="saveCanvas">保存并导出文件</el-button>
      </div>
      <el-color-picker v-model="selectedColor" @change="handleColorChange"></el-color-picker>
    </el-header>
    <el-container>
      <el-aside class="floating-aside">
        <el-menu default-active="1">
          <el-menu-item index="1">
            <el-button type="primary" size="default" @click="clearCanvas" style="width: 100%;">清除</el-button>
          </el-menu-item>
          <el-menu-item index="2">
            <el-button type="primary" size="default" @click="setShape('line')" style="width: 100%;">绘制线条</el-button>
          </el-menu-item>
          <el-menu-item index="3">
            <el-button type="primary" size="default" @click="setShape('circle')" style="width: 100%;">绘制圆形</el-button>
          </el-menu-item>
          <el-menu-item index="4">
            <el-button type="primary" size="default" @click="setShape('rectangle')" style="width: 100%;">绘制矩形</el-button>
          </el-menu-item>
          <el-menu-item index="5">
            <el-button type="primary" size="default" @click="setShape('triangle')" style="width: 100%;">绘制三角形</el-button>
          </el-menu-item>
          <el-menu-item index="6">
            <el-button type="primary" size="default" @click="setShape('diamond')" style="width: 100%;">绘制菱形</el-button>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-main>
          <div ref="canvasContainer" style="overflow: auto; position: relative;">
            <canvas @mousedown="startDrawing" @mousemove="draw" @mouseup="stopDrawing" 
              @mouseleave="stopDrawing" ref="canvas" width="10000" height="10000">
            </canvas>
          </div>
        </el-main>
      </el-container>
    </el-container>
    <input type="file" ref="fileInput" @change="handleFileChange" accept=".svg" style="display: none;" />
  </el-container>
</template>

<script setup lang="ts">
import { useUserStore } from '../store/userStore';
import { onMounted, ref } from 'vue';
import { Canvg } from 'canvg';

// 定义canvas和fileInput的ref
const fileInput = ref<HTMLInputElement | null>(null);
const canvasContainer = ref<HTMLDivElement | null>(null);
const canvas = ref<any>(); // 获取画布
let ctx: CanvasRenderingContext2D; // 获取canvas操作api的入口类型
const paths = ref<{ type: 'line' | 'circle' | 'rectangle' | 'triangle' | 'diamond'; points: { x: number; y: number }[]; color: string }[]>([]);
const drawing = ref(false);
const history = ref<typeof paths.value[]>([]); // 历史记录栈

const shapeType = ref<'line' | 'circle' | 'rectangle' | 'triangle' | 'diamond'>('line');
let startPoint: { x: number; y: number } | null = null;
let svgImage: HTMLImageElement | null = null; // 用于存储导入的SVG图像
const selectedColor = ref('#000000'); // 默认颜色为黑色

let showGrid = ref(true); // 是否显示网格

onMounted(() => {
  ctx = canvas.value.getContext('2d') as CanvasRenderingContext2D;
  drawGrid();
});

// 清除画布
const clearCanvas = () => {
  if (ctx) {
    ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height);
    paths.value = [];
    svgImage = null; // 清除导入的SVG图像
    history.value = []; // 清空历史记录
    drawGrid();
  }
};

// 设置当前形状
const setShape = (shape: 'line' | 'circle' | 'rectangle' | 'triangle' | 'diamond') => {
  shapeType.value = shape;
};

// 处理颜色改变
const handleColorChange = (color: string) => {
  selectedColor.value = color;
};

// 开始绘制
const startDrawing = (event: MouseEvent) => {
  drawing.value = true;
  const { offsetX, offsetY } = event;
  startPoint = { x: offsetX, y: offsetY };
};

const draw = (event: MouseEvent) => {
  if (!drawing.value || !ctx) return;

  // 清空当前路径
  ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height);

  // 重新绘制网格
  drawGrid();

  // 重新绘制导入的SVG图像
  if (svgImage) {
    ctx.drawImage(svgImage, 0, 0);
  }

  // 重新绘制所有路径
  paths.value.forEach(({ type, points, color }) => {
    ctx.strokeStyle = color;
    if (type === 'line') {
      ctx.beginPath();
      points.forEach(({ x, y }, index) => {
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    } else if (type === 'circle') {
      const [start, end] = points;
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'rectangle') {
      const [start, end] = points;
      ctx.beginPath();
      ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
      ctx.stroke();
    } else if (type === 'triangle') {
      const [start, end] = points;
      const width = end.x - start.x;
      ctx.beginPath();
      ctx.moveTo(start.x + width / 2, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineTo(start.x, end.y);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'diamond') {
      const [start, end] = points;
      const width = end.x - start.x;
      const height = end.y - start.y;
      ctx.beginPath();
      ctx.moveTo(start.x + width / 2, start.y);
      ctx.lineTo(end.x, start.y + height / 2);
      ctx.lineTo(start.x + width / 2, end.y);
      ctx.lineTo(start.x, start.y + height / 2);
      ctx.closePath();
      ctx.stroke();
    }
  });

  // 绘制当前路径
  const { offsetX, offsetY } = event;
  if (shapeType.value === 'line') {
    ctx.beginPath();
    ctx.moveTo(startPoint!.x, startPoint!.y);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  } else if (shapeType.value === 'circle' && startPoint) {
    const radius = Math.sqrt(
      Math.pow(offsetX - startPoint.x, 2) + Math.pow(offsetY - startPoint.y, 2)
    );
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (shapeType.value === 'rectangle' && startPoint) {
    ctx.beginPath();
    ctx.rect(startPoint.x, startPoint.y, offsetX - startPoint.x, offsetY - startPoint.y);
    ctx.stroke();
  } else if (shapeType.value === 'triangle' && startPoint) {
    const width = offsetX - startPoint.x;
    ctx.beginPath();
    ctx.moveTo(startPoint.x + width / 2, startPoint.y);
    ctx.lineTo(offsetX, offsetY);
    ctx.lineTo(startPoint.x, offsetY);
    ctx.closePath();
    ctx.stroke();
  } else if (shapeType.value === 'diamond' && startPoint) {
    const width = offsetX - startPoint.x;
    const height = offsetY - startPoint.y;
    ctx.beginPath();
    ctx.moveTo(startPoint.x + width / 2, startPoint.y);
    ctx.lineTo(offsetX, startPoint.y + height / 2);
    ctx.lineTo(startPoint.x + width / 2, offsetY);
    ctx.lineTo(startPoint.x, startPoint.y + height / 2);
    ctx.closePath();
    ctx.stroke();
  }
};

const stopDrawing = (event: MouseEvent) => {
  drawing.value = false;
  if (ctx && startPoint) {
    const { offsetX, offsetY } = event;
    if (shapeType.value === 'line') {
      paths.value.push({
        type: 'line',
        points: [startPoint, { x: offsetX, y: offsetY }],
        color: selectedColor.value,
      });
    } else if (shapeType.value === 'circle') {
      paths.value.push({
        type: 'circle',
        points: [startPoint, { x: offsetX, y: offsetY }],
        color: selectedColor.value,
      });
    } else if (shapeType.value === 'rectangle') {
      paths.value.push({
        type: 'rectangle',
        points: [startPoint, { x: offsetX, y: offsetY }],
        color: selectedColor.value,
      });
    } else if (shapeType.value === 'triangle') {
      paths.value.push({
        type: 'triangle',
        points: [startPoint, { x: offsetX, y: offsetY }],
        color: selectedColor.value,
      });
    } else if (shapeType.value === 'diamond') {
      paths.value.push({
        type: 'diamond',
        points: [startPoint, { x: offsetX, y: offsetY }],
        color: selectedColor.value,
      });
    }
    startPoint = null;
    ctx.beginPath();

    // 保存当前状态到历史记录
    history.value.push([...paths.value]);
  }
};

// 选择文件
const selectFiles = () => {
  fileInput.value?.click(); // 使用ref来获取fileInput并调用click
};

// 处理文件改变
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      const svgContent = e.target?.result as string;
      await loadSVGToCanvas(svgContent);
    };
    ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height);
    paths.value = [];
    history.value = []; // 清空历史记录

    reader.readAsText(file);
  }
};

// 加载SVG到Canvas
const loadSVGToCanvas = async (svg: string) => {
  const v = await Canvg.from(ctx, svg);
  await v.render();
  extractPathsFromSVG(svg); // 解析路径并保存

  // 获取SVG的宽度和高度
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const svgElement = doc.querySelector("svg");
  const svgWidth = parseFloat(svgElement?.getAttribute("width") || "0");
  const svgHeight = parseFloat(svgElement?.getAttribute("height") || "0");

  // 计算缩放比例
  const scaleX = canvas.value!.width / svgWidth;
  const scaleY = canvas.value!.height / svgHeight;

  // 清空画布并重新绘制网格
  ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height);
  drawGrid();

  // 重新绘制SVG路径，并进行坐标转换
  paths.value.forEach(({ type, points, color }) => {
    ctx.strokeStyle = color;
    if (type === 'line') {
      ctx.beginPath();
      points.forEach(({ x, y }, index) => {
        if (index === 0) {
          ctx.moveTo(x * scaleX, y * scaleY);
        } else {
          ctx.lineTo(x * scaleX, y * scaleY);
        }
      });
      ctx.stroke();
    } else if (type === 'circle') {
      const [start, end] = points;
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      ctx.beginPath();
      ctx.arc(start.x * scaleX, start.y * scaleY, radius * scaleX, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'rectangle') {
      const [start, end] = points;
      ctx.beginPath();
      ctx.rect(start.x * scaleX, start.y * scaleY, (end.x - start.x) * scaleX, (end.y - start.y) * scaleY);
      ctx.stroke();
    } else if (type === 'triangle') {
      const [start, end] = points;
      const width = (end.x - start.x) * scaleX;
      ctx.beginPath();
      ctx.moveTo((start.x + width / 2) * scaleX, start.y * scaleY);
      ctx.lineTo(end.x * scaleX, end.y * scaleY);
      ctx.lineTo(start.x * scaleX, end.y * scaleY);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'diamond') {
      const [start, end] = points;
      const width = (end.x - start.x) * scaleX;
      const height = (end.y - start.y) * scaleY;
      ctx.beginPath();
      ctx.moveTo((start.x + width / 2) * scaleX, start.y * scaleY);
      ctx.lineTo(end.x * scaleX, (start.y + height / 2) * scaleY);
      ctx.lineTo((start.x + width / 2) * scaleX, end.y * scaleY);
      ctx.lineTo(start.x * scaleX, (start.y + height / 2) * scaleY);
      ctx.closePath();
      ctx.stroke();
    }
  });
};

// 解析 SVG 并提取路径
const extractPathsFromSVG = (svg: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const pathElements = doc.querySelectorAll("path");
  const circleElements = doc.querySelectorAll("circle");
  const rectElements = doc.querySelectorAll("rect");
  const polygonElements = doc.querySelectorAll("polygon");

  pathElements.forEach(path => {
    const d = path.getAttribute("d");
    const stroke = path.getAttribute("stroke") || '#000000'; // 默认颜色为黑色
    if (d) {
      const points = parsePathData(d);
      paths.value.push({ type: 'line', points, color: stroke });
    }
  });

  circleElements.forEach(circle => {
    const cx = parseFloat(circle.getAttribute("cx") || "0");
    const cy = parseFloat(circle.getAttribute("cy") || "0");
    const r = parseFloat(circle.getAttribute("r") || "0");
    const stroke = circle.getAttribute("stroke") || '#000000'; // 默认颜色为黑色
    paths.value.push({
      type: 'circle',
      points: [{ x: cx - r, y: cy }, { x: cx + r, y: cy }],
      color: stroke,
    });
  });

  rectElements.forEach(rect => {
    const x = parseFloat(rect.getAttribute("x") || "0");
    const y = parseFloat(rect.getAttribute("y") || "0");
    const width = parseFloat(rect.getAttribute("width") || "0");
    const height = parseFloat(rect.getAttribute("height") || "0");
    const stroke = rect.getAttribute("stroke") || '#000000'; // 默认颜色为黑色
    paths.value.push({
      type: 'rectangle',
      points: [{ x, y }, { x: x + width, y: y + height }],
      color: stroke,
    });
  });

  polygonElements.forEach(polygon => {
    const points = polygon.getAttribute("points") || '';
    const stroke = polygon.getAttribute("stroke") || '#000000'; // 默认颜色为黑色
    const pointsArray = points.split(' ').map(point => {
      const [x, y] = point.split(',').map(Number);
      return { x, y };
    });
    if (pointsArray.length === 3) {
      paths.value.push({
        type: 'triangle',
        points: pointsArray,
        color: stroke,
      });
    } else if (pointsArray.length === 4) {
      paths.value.push({
        type: 'diamond',
        points: pointsArray,
        color: stroke,
      });
    }
  });

  // 保存当前状态到历史记录
  history.value.push([...paths.value]);
};

// 解析路径数据（简单示例）
const parsePathData = (d: string) => {
  const points: { x: number; y: number; }[] = [];
  const commands = d.match(/[MLC][^MLC]*/g); // 匹配 M, L, C 命令
  if (commands) {
    commands.forEach(command => {
      const parts = command.slice(1).trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i < parts.length; i += 2) {
        points.push({ x: parts[i], y: parts[i + 1] });
      }
    });
  }
  return points;
};

// 导出canvas为图片
const saveCanvas = () => {
  const svgData = createSVG();
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'drawing.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 撤销操作
const undo = () => {
  if (history.value.length > 0) {
    history.value.pop(); // 移除当前状态
    paths.value = history.value.length > 0 ? [...history.value[history.value.length - 1]] : [];
    ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height);
    drawGrid(); // 重新绘制网格
    paths.value.forEach(({ type, points, color }) => {
      ctx.strokeStyle = color;
      if (type === 'line') {
        ctx.beginPath();
        points.forEach(({ x, y }, index) => {
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      } else if (type === 'circle') {
        const [start, end] = points;
        const radius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (type === 'rectangle') {
        const [start, end] = points;
        ctx.beginPath();
        ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
        ctx.stroke();
      } else if (type === 'triangle') {
        const [start, end] = points;
        const width = end.x - start.x;
        ctx.beginPath();
        ctx.moveTo(start.x + width / 2, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(start.x, end.y);
        ctx.closePath();
        ctx.stroke();
      } else if (type === 'diamond') {
        const [start, end] = points;
        const width = end.x - start.x;
        const height = end.y - start.y;
        ctx.beginPath();
        ctx.moveTo(start.x + width / 2, start.y);
        ctx.lineTo(end.x, start.y + height / 2);
        ctx.lineTo(start.x + width / 2, end.y);
        ctx.lineTo(start.x, start.y + height / 2);
        ctx.closePath();
        ctx.stroke();
      }
    });
  }
};

// 下载后，在浏览器下载出可查看
// 更新createSVG函数以包含圆形和矩形
const createSVG = () => {
  const svgPaths = paths.value.map(({ type, points, color }) => {
    if (type === 'line') {
      return `<path d="${points.map((point, index) => {
        if (index === 0) {
          return `M ${point.x} ${point.y}`; // Move to the first point
        } else {
          return `L ${point.x} ${point.y}`; // Line to the next point
        }
      }).join(' ')}" stroke="${color}" fill="none" stroke-width="2"/>`;
    } else if (type === 'circle') {
      const [start, end] = points;
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      return `<circle cx="${start.x}" cy="${start.y}" r="${radius}" stroke="${color}" fill="none" stroke-width="2"/>`;
    } else if (type === 'rectangle') {
      const [start, end] = points;
      return `<rect x="${start.x}" y="${start.y}" width="${end.x - start.x}" height="${end.y - start.y}" stroke="${color}" fill="none" stroke-width="2"/>`;
    } else if (type === 'triangle') {
      const [start, end] = points;
      const width = end.x - start.x;
      return `<polygon points="${start.x + width / 2},${start.y} ${end.x},${end.y} ${start.x},${end.y}" stroke="${color}" fill="none" stroke-width="2"/>`;
    } else if (type === 'diamond') {
      const [start, end] = points;
      const width = end.x - start.x;
      const height = end.y - start.y;
      return `<polygon points="${start.x + width / 2},${start.y} ${end.x},${start.y + height / 2} ${start.x + width / 2},${end.y} ${start.x},${start.y + height / 2}" stroke="${color}" fill="none" stroke-width="2"/>`;
    }
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">
            ${svgPaths}
          </svg>`;
};

// 切换网格显示
const toggleGrid = () => {
  showGrid.value = !showGrid.value;
  ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height); // 清除画布
  drawGrid(); // 立即绘制网格
  drawPaths(); // 重新绘制所有路径和图形
};

// 绘制网格
const drawGrid = () => {
  if (!showGrid.value) return;
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  const gridSize = 50;
  for (let x = 0; x < canvas.value!.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.value!.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.value!.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.value!.width, y);
    ctx.stroke();
  }
};

// 重新绘制所有路径和图形
const drawPaths = () => {
  paths.value.forEach(({ type, points, color }) => {
    ctx.strokeStyle = color;
    if (type === 'line') {
      ctx.beginPath();
      points.forEach(({ x, y }, index) => {
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    } else if (type === 'circle') {
      const [start, end] = points;
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'rectangle') {
      const [start, end] = points;
      ctx.beginPath();
      ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
      ctx.stroke();
    } else if (type === 'triangle') {
      const [start, end] = points;
      const width = end.x - start.x;
      ctx.beginPath();
      ctx.moveTo(start.x + width / 2, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineTo(start.x, end.y);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'diamond') {
      const [start, end] = points;
      const width = end.x - start.x;
      const height = end.y - start.y;
      ctx.beginPath();
      ctx.moveTo(start.x + width / 2, start.y);
      ctx.lineTo(end.x, start.y + height / 2);
      ctx.lineTo(start.x + width / 2, end.y);
      ctx.lineTo(start.x, start.y + height / 2);
      ctx.closePath();
      ctx.stroke();
    }
  });
};

const userStore = useUserStore();
userStore.setUsername('admin');
</script>

<style scoped>
.el-container {
  height: 100%;
}

.el-header {
  color: var(--el-text-color-primary);
  text-align: center;
  line-height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 100%;
  background-color: #d3dce6;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.header-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  gap: 10px;
  background-color: #d3dce6;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 0 20px;
  width: 100%;
  height: 100%;
}

.floating-aside {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 150px;
  background-color: #d3dce6;
  color: var(--el-text-color-primary);
  text-align: center;
  line-height: 200px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.el-main {
  background-color: #e9eef3;
  color: var(--el-text-color-primary);
  text-align: center;
  line-height: 160px;
}
</style>