import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, History } from 'lucide-react'
import { OcrMode as OcrModeType } from '@/types/ocr'
import { UploadMode } from './components/UploadMode'
import { HistoryMode } from './components/HistoryMode'

export function OcrEditor() {
  const [ocrMode, setOcrMode] = useState<OcrModeType>('upload')

  return (
    <div className="h-full flex flex-col">
      <Tabs value={ocrMode} onValueChange={(value) => setOcrMode(value as OcrModeType)} className="flex-1">
        <div className="px-6 py-4">
          <TabsList>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4" />
              图片识别
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4" />
              识别历史
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="upload">
          <UploadMode />
        </TabsContent>

        <TabsContent value="history">
          <HistoryMode />
        </TabsContent>
      </Tabs>
    </div>
  )
}