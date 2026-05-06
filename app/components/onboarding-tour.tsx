import { useEffect, useState } from "react";
import { Joyride, STATUS, ACTIONS, EVENTS } from "react-joyride";
import type { EventData, Step, TooltipRenderProps } from "react-joyride";
import { useLocation, useNavigate } from "react-router";

function TourTooltip({
  index,
  step,
  isLastStep,
  closeProps,
  primaryProps,
  tooltipProps,
}: TooltipRenderProps) {

  return (
    <div
      {...tooltipProps}
      className="bg-brand-surface-solid border border-brand-hairline p-5 md:p-6 rounded-2xl max-w-[320px] md:max-w-[360px] w-full shadow-[0_16px_40px_rgba(0,0,0,0.4)] saturate-140 font-sans"
    >
      {step.title && (
        <h3 className="text-[17px] font-bold text-brand-text mb-2.5 tracking-[-0.3px]">
          {step.title}
        </h3>
      )}
      <div className="text-[13.5px] text-brand-text-dim leading-relaxed mb-6">
        {step.content}
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-2">
          <span className="text-[11.5px] font-bold text-brand-text-mute font-mono">
            {index + 1} / 5
          </span>
        </div>
        <div className="flex gap-2.5 items-center">
          <button
            {...closeProps}
            type="button"
            className="px-3 py-2 rounded-xl text-[12.5px] font-bold text-brand-text-mute hover:text-brand-text transition-colors border-none bg-transparent cursor-pointer"
          >
            Lewati
          </button>
          <button
            {...primaryProps}
            type="button"
            className="px-4 py-2.5 rounded-xl text-[12.5px] font-bold text-brand-bg bg-linear-to-r from-brand-accent to-brand-violet shadow-[0_4px_12px_rgba(52,245,160,0.2)] border-none cursor-pointer hover:opacity-90 transition-opacity active:scale-95"
          >
            {isLastStep ? "Mulai Pakai" : "Lanjut"}
          </button>
        </div>
      </div>
    </div>
  );
}

function pathForStep(idx: number): string {
  const paths = ["/", "/profil", "/", "/transaksi", "/anggaran"];
  return paths[idx] ?? "/";
}

export function OnboardingTour({ dark }: { dark: boolean }) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // nextStep holds the pending step we need to navigate to before advancing
  const [nextStep, setNextStep] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Start tour once on mount
  useEffect(() => {
    if (localStorage.getItem("kacek_tour_completed")) return;
    const t = setTimeout(() => setRun(true), 500);
    return () => clearTimeout(t);
  }, []);

  // Navigate to the correct page then advance the step
  useEffect(() => {
    if (nextStep === null) return;

    const expected = pathForStep(nextStep);
    const currentPath = location.pathname.replace(/\/$/, "") || "/";
    const targetPath = expected.replace(/\/$/, "") || "/";

    if (currentPath !== targetPath) {
      navigate(expected);
      return;
    }

    // On correct page — wait for DOM to settle, then resume
    // 700ms is usually enough for data to load and elements to appear
    const t = setTimeout(() => {
      setStepIndex(nextStep);
      setNextStep(null);
      setRun(true);
    }, 700);
    return () => clearTimeout(t);
  }, [nextStep, location.pathname, navigate]);

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  const steps: Step[] = [
    {
      target: "body",
      placement: "center",
      title: "Selamat datang di Kacek! 👋",
      content:
        "Aplikasi keuangan yang super simpel dan elegan. Mari kita lihat cara pakainya dalam 1 menit.",
      skipBeacon: true,
    },
    {
      target: ".tour-wallet",
      title: "Dompet & Rekening",
      content:
        "Di halaman profil ini kamu bisa mengelola semua dompetmu (Cash, Bank, E-Wallet) agar saldonya terpisah dengan rapi.",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: isDesktop ? ".tour-desktop-form" : ".tour-fab",
      title: "Catat Transaksi Cepat",
      content:
        "Gunakan tombol atau form ini kapan saja untuk mencatat pemasukan/pengeluaran baru. Sangat cepat!",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: ".tour-tx-list",
      placement: "top",
      title: "Riwayat Transaksi",
      content:
        "Di halaman Transaksi, kamu bisa melihat detail riwayat lengkap. Bisa cari, filter, atau edit transaksi lama dengan mudah.",
      skipBeacon: true,
    },
    {
      target: ".tour-budget",
      placement: "top",
      title: "Atur Anggaran",
      content:
        "Jangan sampai kebobolan! Buat batas maksimal pengeluaran untuk setiap kategori di halaman Anggaran.",
      skipBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data: EventData) => {
    const { action, index, status, type } = data;

    if (
      status === STATUS.FINISHED || 
      (status === STATUS.SKIPPED && action === ACTIONS.SKIP) ||
      action === ACTIONS.CLOSE
    ) {
      setRun(false);
      localStorage.setItem("kacek_tour_completed", "true");
      setStepIndex(0);
      setNextStep(null);
      if (location.pathname !== "/") navigate("/");
      return;
    }

    // Handle step changes and missing targets (for multi-page navigation)
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const isNext = action === ACTIONS.NEXT;
      const isPrev = action === ACTIONS.PREV;

      if (isNext || isPrev) {
        setRun(false);
        // If the step just finished, go to next/prev
        // If target was not found, we stay on THIS index and try to navigate to its page
        const targetIndex = type === EVENTS.TARGET_NOT_FOUND ? index : (isNext ? index + 1 : index - 1);
        
        // Ensure we don't go out of bounds
        if (targetIndex >= 0 && targetIndex < steps.length) {
          setNextStep(targetIndex);
        }
      }
    }
  };

  return (
    <Joyride
      onEvent={handleJoyrideCallback}
      continuous
      run={run}
      stepIndex={stepIndex}
      steps={steps}
      tooltipComponent={TourTooltip}
      options={{
        overlayColor: dark
          ? "rgba(10, 10, 15, 0.75)"
          : "rgba(20, 30, 60, 0.6)",
        zIndex: 1000,
        showProgress: false,
        buttons: ["back", "skip", "primary"],
        overlayClickAction: false,
        arrowColor: dark ? "rgba(34,38,48,0.95)" : "#ffffff",
      }}
    />
  );
}
