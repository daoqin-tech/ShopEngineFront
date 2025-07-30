import { CheckCircle } from 'lucide-react';
import { Step, StepIndicatorProps } from './types';

export function StepIndicator({ currentStep, onStepClick, canClickStep2 }: StepIndicatorProps) {
  const steps = [
    { number: 1, title: '生成和编辑提示词', description: '描述需求，生成并编辑提示词' },
    { number: 2, title: '生成图片', description: '为选中的提示词生成AI图片' }
  ];

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        const canClick = step.number === 1 || (step.number === 2 && canClickStep2);
        
        return (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex items-center">
              <button
                onClick={() => canClick && onStepClick(step.number as Step)}
                disabled={!canClick}
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                  isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : isActive
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : canClick
                    ? 'border-gray-300 text-gray-400 hover:border-blue-300 hover:text-blue-500 cursor-pointer'
                    : 'border-gray-200 text-gray-300 cursor-not-allowed'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="font-semibold text-sm">{step.number}</span>
                )}
              </button>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </h3>
                <p className="text-xs text-gray-400">{step.description}</p>
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                isCompleted ? 'bg-green-300' : 'bg-gray-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}