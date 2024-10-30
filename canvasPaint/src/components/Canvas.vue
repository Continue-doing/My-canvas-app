<template>
    <el-container>
      <el-header>
        <el-button type="primary" size="default" @click="selectFiles">选择文件</el-button>
        <el-button type="primary" size="default" @click="saveCanvas">保存并导出文件</el-button>
      </el-header>
      <el-container>
        <el-aside width="200px">
          <el-button type="primary" size="default" @click="clearCanvas">清除</el-button>
          <el-button type="primary" size="default" @click="setShape('line')">绘制直线</el-button>
          <el-button type="primary" size="default" @click="setShape('circle')">绘制圆形</el-button>
        </el-aside>
        <el-container>
          <el-main>
            <canvas @mousedown="startDrawing" @mousemove="draw" @mouseup="stopDrawing" 
              @mouseleave="stopDrawing" ref="canvas" width="10000" height="10000">
            </canvas>
          </el-main>
          <el-footer>Footer</el-footer>
        </el-container>
      </el-container>
      <input type="file" ref="fileInput" @change="handleFileChange" accept=".svg" style="display: none;" />
    </el-container>
  </template>
  
  <script setup lang="ts">
  import { useUserStore } from '../store/userStore';
  import { onMounted, ref } from 'vue';
  
  // 定义canvas和fileInput的ref
  const fileInput = ref<HTMLInputElement | null>(null);
  const canvas = ref<any>(); // 获取画布
  let ctx: CanvasRenderingContext2D; // 获取canvas操作api的入口类型
  const paths = ref<{ type: 'line' | 'circle'; points: { x: number; y: number }[] }[]>([]);
  const drawing = ref(false);
  
  const shapeType = ref<'line' | 'circle'>('line');
  let startPoint: { x: number; y: number } | null = null;
  
  onMounted(() => {
    ctx = canvas.value.getContext('2d') as CanvasRenderingContext2D;
  });
  
  // 清除画布
  const clearCanvas = () => {
    if (ctx) {
      ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height);
      paths.value = [];
    }
  };
  
  // 设置当前形状
  const setShape = (shape: 'line' | 'circle') => {
    shapeType.value = shape;
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
  
    // 重新绘制所有路径
    paths.value.forEach(({ type, points }) => {
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
        });
      } else if (shapeType.value === 'circle') {
        paths.value.push({
          type: 'circle',
          points: [startPoint, { x: offsetX, y: offsetY }],
        });
      }
      startPoint = null;
      ctx.beginPath();
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
  
      reader.onload = (e) => {
        const svgContent = e.target?.result as string;
        loadSVGToCanvas(svgContent);
      };
      ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height);
      paths.value = [];
  
      reader.readAsText(file);
    }
  };
  
  // 加载SVG到Canvas
  const loadSVGToCanvas = (svg: string) => {
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
  
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.value.width, canvas.value.height); // 清空画布
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      extractPathsFromSVG(svg); // 解析路径并保存
    };
    img.src = url;
  };
  
  // 解析 SVG 并提取路径
  const extractPathsFromSVG = (svg: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const pathElements = doc.querySelectorAll("path");
    
    pathElements.forEach(path => {
      const d = path.getAttribute("d");
      if (d) {
        const points = parsePathData(d);
        paths.value.push({ type: 'line', points }); // 将路径点包装成符合 paths 数组类型的对象
      }
    });
  }
  
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
  
  // 下载后，在浏览器下载出可查看
  // 更新createSVG函数以包含圆形和矩形
  const createSVG = () => {
    const svgPaths = paths.value.map(({ type, points }) => {
      if (type === 'line') {
        return `<path d="${points.map((point, index) => {
          if (index === 0) {
            return `M ${point.x} ${point.y}`; // Move to the first point
          } else {
            return `L ${point.x} ${point.y}`; // Line to the next point
          }
        }).join(' ')}" stroke="black" fill="none" stroke-width="2"/>`;
      } else if (type === 'circle') {
        const [start, end] = points;
        const radius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        return `<circle cx="${start.x}" cy="${start.y}" r="${radius}" stroke="black" fill="none" stroke-width="2"/>`;
      }
    }).join('');
  
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">
              ${svgPaths}
            </svg>`;
  };
  
  const userStore = useUserStore();
  userStore.setUsername('admin');
  </script>
  
  <style scoped>
  .el-container {
    height: 100%;
  }
  
  .el-header,
  .el-footer {
    background-color: #b3c0d1;
    color: var(--el-text-color-primary);
    text-align: center;
    line-height: 60px;
  }
  
  .el-aside {
    background-color: #d3dce6;
    color: var(--el-text-color-primary);
    text-align: center;
    line-height: 200px;
  }
  
  .el-main {
    background-color: #e9eef3;
    color: var(--el-text-color-primary);
    text-align: center;
    line-height: 160px;
  }
  </style>