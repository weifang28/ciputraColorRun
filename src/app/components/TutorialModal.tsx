"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface TutorialStep {
  title: string;
  description: string;
  image: string;
  tip?: string;
}

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TutorialStep[];
}

export default function TutorialModal({ isOpen, onClose, steps }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const goToNextStep = () => {
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goToPrevStep = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const handleSkip = () => {
    setCurrentStep(steps.length - 1);
  };

  const handleFinish = () => {
    setCurrentStep(0);
    onClose();
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-zoomIn">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#d1e9d5] to-[#e4a1a6]">
          <div>
            <h3 className="text-lg font-bold text-emerald-700">Registration Tutorial</h3>
            {/* show step counter only if there is more than one step */}
            {steps.length > 1 && (
              <div className="text-sm text-emerald-600/90">Step {currentStep + 1} of {steps.length}</div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded" aria-label="Close">
            <X className="text-white" />
          </button>
        </div>

        <div className="bg-gray-200 h-2">
          <div
            className="h-full bg-emerald-600"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <h4 className="text-2xl font-semibold mb-3 text-[#602d4e]">{currentStepData.title}</h4>
          <p className="text-[#e687a4] mb-4">{currentStepData.description}</p>

          {/* Image area: make relative so we can absolutely position arrows */}
          <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
            {/* left arrow (overlaid) */}
            {steps.length > 1 && (
              <button
                onClick={goToPrevStep}
                disabled={currentStep === 0}
                aria-label="Previous step"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 shadow hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft className="text-[#de9fa9]"/>
              </button>
            )}

            {/* image */}
            <img
              src={currentStepData.image}
              alt={currentStepData.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect fill='%23e6ffef' width='800' height='450'/%3E%3Ctext fill='%23004624' font-family='sans-serif' font-size='28' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3EPlaceholder Image%3C/text%3E%3C/svg%3E";
              }}
            />

            {/* right arrow (overlaid) */}
            {steps.length > 1 && (
              <button
                onClick={() => {
                  if (currentStep < steps.length - 1) goToNextStep();
                }}
                disabled={currentStep >= steps.length - 1}
                aria-label="Next step"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 shadow hover:bg-white disabled:opacity-40"
              >
                <ChevronRight className="text-[#de9fa9]"/>
              </button>
            )}
          </div>

          {currentStepData.tip && (
            <div className="p-3 bg-[#e99ca9] border-l-4 border-[#e687a4] rounded">
              <strong className="text-[#602d4e]">Tip:</strong> <span className="text-[#602d4e]/80">{currentStepData.tip}</span>
            </div>
          )}
        </div>

        {/* Footer: arrows removed from here; primary action only on final step */}
        <div className="border-t border-gray-200 px-8 py-5 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            {currentStep === steps.length - 1 && (
              <button onClick={handleFinish} className="px-4 py-2 bg-emerald-600 text-white rounded">
                Start Registration
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}