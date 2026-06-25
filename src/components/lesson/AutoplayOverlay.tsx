'use client';

interface Lesson {
  id: string;
  title: string;
  duration_seconds: number;
  video_id: string;
  position: number;
  description?: string;
  submodule?: string | null;
}

interface AutoplayOverlayProps {
  countdownDisplay: number;
  nextLesson: Lesson;
  onWatchNow: () => void;
  onReverAula: () => void;
}

export function AutoplayOverlay({
  countdownDisplay,
  nextLesson,
  onWatchNow,
  onReverAula,
}: AutoplayOverlayProps) {
  return (
    <div className="absolute bottom-16 right-6 z-40 bg-card/95 backdrop-blur border border-border rounded-2xl p-4 shadow-2xl max-w-xs animate-page-enter flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">
          Próxima Aula em {countdownDisplay}s
        </span>
        <h5 className="text-xs font-extrabold text-foreground line-clamp-1">
          {nextLesson.title}
        </h5>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onWatchNow}
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-xl flex items-center gap-1 cursor-pointer"
        >
          Assistir agora
        </button>
        <button
          onClick={onReverAula}
          className="border border-border hover:bg-secondary text-muted-foreground hover:text-foreground font-bold text-[10px] py-1.5 px-3 rounded-xl cursor-pointer"
        >
          Rever Aula
        </button>
      </div>
    </div>
  );
}
