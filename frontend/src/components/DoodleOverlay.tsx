import React, { useEffect, useRef, useState } from 'react';

interface DoodleCommand {
  0: string; // type: 'color' | 'move' | 'line' | 'width'
  1: string | number; // value
  2?: number; // y for move/line
}

const DoodleOverlay: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [commands, setCommands] = useState<DoodleCommand[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<any>(null);
  const animationRef = useRef<any>(null);

  const INACTIVITY_LIMIT = 30000; // 30 seconds

  const resetTimer = () => {
    setIsActive(false);
    setCommands([]);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      await startDoodling();
    }, INACTIVITY_LIMIT);
  };

  const startDoodling = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/doodle');
      const data = await response.json();
      if (data.commands && data.commands.length > 0) {
        setCommands(data.commands);
        setIsActive(true);
      }
    } catch (error) {
      console.error('Failed to fetch doodle:', error);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('mousedown', resetTimer);
    
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('mousedown', resetTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (isActive && canvasRef.current && commands.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let commandIndex = 0;
      let lastUpdate = performance.now();
      const DRAW_SPEED = 150; // ms between commands

      const draw = (now: number) => {
        if (now - lastUpdate > DRAW_SPEED) {
          const cmd = commands[commandIndex];
          if (cmd) {
            const type = cmd[0];
            if (type === 'color') {
              ctx.strokeStyle = cmd[1] as string;
            } else if (type === 'width') {
              ctx.lineWidth = cmd[1] as number;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
            } else if (type === 'move') {
              ctx.beginPath();
              ctx.moveTo(cmd[1] as number, cmd[2] as number);
            } else if (type === 'line') {
              ctx.lineTo(cmd[1] as number, cmd[2] as number);
              ctx.stroke();
            }
            commandIndex++;
            lastUpdate = now;
          }
        }

        if (commandIndex < commands.length) {
          animationRef.current = requestAnimationFrame(draw);
        }
      };

      animationRef.current = requestAnimationFrame(draw);
    }
  }, [isActive, commands]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        className="w-[80vmin] h-[80vmin] border-2 border-white/10 glass rounded-3xl"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 glass rounded-full text-[10px] text-white/40 uppercase tracking-widest animate-pulse">
        AI is doodling your thoughts...
      </div>
    </div>
  );
};

export default DoodleOverlay;
