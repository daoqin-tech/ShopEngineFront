# 纸袋 PDF 转换为完全 CMYK 说明

## 当前状态
系统导出的纸袋 PDF：
- ✅ 文本（货号）：CMYK 色彩空间
- ⚠️ 图片：RGB 色彩空间

## 是否需要转换？
**大多数印刷厂可以直接使用当前 PDF**，无需转换。

如果印刷厂明确要求完全 CMYK PDF，可使用以下方法转换。

---

## 方法 1：使用 Ghostscript（推荐）

### Mac/Linux 系统

1. 安装 Ghostscript：
```bash
# Mac
brew install ghostscript

# Ubuntu/Debian
sudo apt-get install ghostscript
```

2. 转换 PDF：
```bash
gs -sOutputFile=output_cmyk.pdf \
   -sDEVICE=pdfwrite \
   -sColorConversionStrategy=CMYK \
   -sProcessColorModel=DeviceCMYK \
   -dProcessColorModel=/DeviceCMYK \
   input.pdf
```

### Windows 系统

1. 下载 Ghostscript：https://www.ghostscript.com/download/gsdnld.html

2. 安装后，在命令提示符中运行：
```cmd
"C:\Program Files\gs\gs10.XX.X\bin\gswin64c.exe" ^
   -sOutputFile=output_cmyk.pdf ^
   -sDEVICE=pdfwrite ^
   -sColorConversionStrategy=CMYK ^
   -sProcessColorModel=DeviceCMYK ^
   -dProcessColorModel=/DeviceCMYK ^
   input.pdf
```

---

## 方法 2：使用在线工具

访问以下网站上传 PDF 转换：
- https://www.pdf2cmyk.com/
- https://www.rgb2cmyk.org/

**注意**：在线工具会上传你的文件到第三方服务器，请谨慎使用。

---

## 方法 3：使用 Adobe Acrobat（需付费版）

1. 打开 PDF
2. 工具 → 印刷制作 → 转换颜色
3. 选择 CMYK 配置文件
4. 转换所有颜色为 CMYK

---

## 验证转换结果

使用 Adobe Acrobat：
1. 工具 → 印刷制作 → 输出预览
2. 查看色彩空间，确认全部为 CMYK

---

## 技术说明

- 当前使用 pdf-lib 库生成 PDF
- 浏览器限制：Canvas API 仅支持 RGB 色彩空间
- 未来计划：后端自动转换为完全 CMYK PDF
