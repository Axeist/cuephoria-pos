import React from 'react';
import { GraduationCap, Timer } from 'lucide-react';
import { LEARNING_PATHS } from '@/data/howToGuide';
import { cn } from '@/lib/utils';

const HowToLearningPaths: React.FC = () => (
  <section className="mb-8">
    <div className="mb-4 flex items-center gap-2">
      <GraduationCap className="h-5 w-5 text-violet-300" />
      <h2 className="text-lg font-bold text-white">Learning paths by role</h2>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {LEARNING_PATHS.map((path) => (
        <div
          key={path.id}
          className={cn(
            'group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-5 transition-all hover:border-white/20 hover:shadow-[0_20px_50px_-30px_rgba(167,139,250,0.45)]',
            path.gradient
          )}
        >
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            {path.duration}
          </p>
          <h3 className="mt-1 text-base font-bold text-white">{path.role}</h3>
          <p className="mt-1 text-xs text-zinc-300">{path.subtitle}</p>
          <ul className="mt-4 space-y-1.5">
            {path.modules.map((m) => (
              <li key={m} className="flex items-center gap-2 text-xs text-zinc-200">
                <span className="h-1 w-1 rounded-full bg-violet-400" />
                {m}
              </li>
            ))}
          </ul>
          <div className="mt-4 inline-flex items-center gap-1 text-[10px] font-medium text-violet-200/80">
            <Timer className="h-3 w-3" />
            Follow modules below in order
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default HowToLearningPaths;
