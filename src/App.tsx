/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, FormEvent, ReactNode } from 'react';
import { 
  Plus, Trash2, CheckCircle2, Circle, ListTodo, 
  Calendar, Camera, User, Clock, Briefcase, 
  Heart, Lightbulb, ChevronRight, Play, Pause, 
  RotateCcw, X, GripVertical, Check
} from 'lucide-react';
import { motion, AnimatePresence, Reorder, useMotionValue, useTransform } from 'motion/react';
import confetti from 'canvas-confetti';

// --- Types ---
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  category: 'Work' | 'Life' | 'Ideas';
  dueDate?: string;
  createdAt: number;
}

type View = 'dashboard' | 'timer' | 'tasks';

// --- Constants ---
const CATEGORIES = [
  { name: 'Work', icon: Briefcase, color: 'bg-blue-500' },
  { name: 'Life', icon: Heart, color: 'bg-rose-500' },
  { name: 'Ideas', icon: Lightbulb, color: 'bg-amber-500' },
] as const;

// --- Helper: Smart Input Parser ---
const parseSmartInput = (input: string) => {
  let text = input;
  let dueDate = '';
  
  const tomorrowRegex = /\btomorrow\b/i;
  const todayRegex = /\btoday\b/i;
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;

  if (tomorrowRegex.test(input)) {
    dueDate = 'Tomorrow';
    text = text.replace(tomorrowRegex, '').trim();
  } else if (todayRegex.test(input)) {
    dueDate = 'Today';
    text = text.replace(todayRegex, '').trim();
  }

  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    dueDate += (dueDate ? ' at ' : '') + timeMatch[0];
    text = text.replace(timeRegex, '').trim();
  }

  return { text, dueDate };
};

// --- Components ---

const GlassCard = ({ children, className = "", onClick }: { children: ReactNode, className?: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`glass rounded-3xl p-6 border border-white/10 shadow-2xl ${className}`}
  >
    {children}
  </div>
);

const Dashboard = ({ 
  todos, 
  setView, 
  setSelectedCategory, 
  profileImage, 
  onProfileClick 
}: { 
  todos: Todo[], 
  setView: (v: View) => void, 
  setSelectedCategory: (c: Todo['category']) => void,
  profileImage: string | null,
  onProfileClick: () => void,
  key?: string
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-8"
  >
    <header className="flex justify-between items-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">TaskFlow Pro</h1>
        <p className="text-white/50 mt-1">Focus on what matters.</p>
      </div>
      <button 
        onClick={onProfileClick}
        className="w-14 h-14 rounded-2xl glass flex items-center justify-center overflow-hidden border-2 border-white/10 hover:border-blue-500/50 transition-colors group relative"
      >
        {profileImage ? (
          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <User size={24} className="text-white/50 group-hover:text-white transition-colors" />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Camera size={16} className="text-white" />
        </div>
      </button>
    </header>

    {/* Bento Grid */}
    <div className="grid grid-cols-2 gap-4">
      <GlassCard 
        className="col-span-2 h-48 flex flex-col justify-between bg-gradient-to-br from-blue-600/20 to-transparent cursor-pointer group"
        onClick={() => setView('timer')}
      >
        <div className="flex justify-between items-start">
          <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <ChevronRight className="text-white/30 group-hover:translate-x-1 transition-transform" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Focus Session</h3>
          <p className="text-white/50 text-sm">25:00 • Deep Work</p>
        </div>
      </GlassCard>

      {CATEGORIES.map((cat) => (
        <div key={cat.name}>
          <GlassCard 
            className="h-40 flex flex-col justify-between cursor-pointer hover:bg-white/10 transition-colors group"
            onClick={() => {
              setSelectedCategory(cat.name);
              setView('tasks');
            }}
          >
            <div className={`w-10 h-10 ${cat.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
              <cat.icon size={20} />
            </div>
            <div>
              <h3 className="font-semibold">{cat.name}</h3>
              <p className="text-white/50 text-xs">
                {todos.filter(t => t.category === cat.name && !t.completed).length} tasks
              </p>
            </div>
          </GlassCard>
        </div>
      ))}
    </div>
  </motion.div>
);

const TaskList = ({ 
  todos, 
  setTodos, 
  selectedCategory, 
  setView, 
  toggleTodo, 
  deleteTodo 
}: { 
  todos: Todo[], 
  setTodos: (t: Todo[]) => void, 
  selectedCategory: Todo['category'], 
  setView: (v: View) => void,
  toggleTodo: (id: string) => void,
  deleteTodo: (id: string) => void,
  key?: string
}) => {
  const categoryTodos = todos.filter(t => t.category === selectedCategory);
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-32"
    >
      <header className="flex items-center gap-4">
        <button onClick={() => setView('dashboard')} className="p-2 glass rounded-xl hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-bold">{selectedCategory}</h2>
      </header>

      <Reorder.Group 
        axis="y" 
        values={categoryTodos} 
        onReorder={(newOrder) => {
          const otherTodos = todos.filter(t => t.category !== selectedCategory);
          setTodos([...newOrder, ...otherTodos]);
        }}
        className="space-y-4"
      >
        <AnimatePresence mode="popLayout">
          {categoryTodos.map((todo) => (
            <Reorder.Item
              key={todo.id}
              value={todo}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="group relative"
            >
              {/* Swipe Background */}
              <div className="absolute inset-0 bg-rose-500 rounded-3xl flex items-center justify-end px-6 text-white">
                <Trash2 size={24} />
              </div>

              <motion.div
                drag="x"
                dragConstraints={{ left: -100, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) {
                    deleteTodo(todo.id);
                  }
                }}
                className="relative"
              >
                <GlassCard className={`flex items-center gap-4 py-4 ${todo.completed ? 'opacity-50' : ''}`}>
                  <GripVertical className="text-white/20 cursor-grab active:cursor-grabbing" size={20} />
                  <button 
                    onClick={() => toggleTodo(todo.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      todo.completed ? 'bg-blue-500 border-blue-500' : 'border-white/20'
                    }`}
                  >
                    {todo.completed && <Check size={14} />}
                  </button>
                  <div className="flex-grow">
                    <p className={`text-lg ${todo.completed ? 'line-through' : ''}`}>{todo.text}</p>
                    {todo.dueDate && (
                      <p className="text-xs text-blue-400 font-medium mt-0.5">{todo.dueDate}</p>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {categoryTodos.length === 0 && (
        <div className="text-center py-20 text-white/20">
          <ListTodo size={48} className="mx-auto mb-4 opacity-10" />
          <p>No tasks yet.</p>
        </div>
      )}
    </motion.div>
  );
};

const TimerView = ({ 
  timerTime, 
  setTimerTime, 
  isTimerRunning, 
  setIsTimerRunning, 
  timerMode, 
  setView 
}: { 
  timerTime: number, 
  setTimerTime: (t: number | ((prev: number) => number)) => void,
  isTimerRunning: boolean,
  setIsTimerRunning: (r: boolean) => void,
  timerMode: 'focus' | 'break',
  setView: (v: View) => void,
  key?: string
}) => {
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timerTime / (timerMode === 'focus' ? 25 * 60 : 5 * 60)) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center min-h-[70vh] space-y-12"
    >
      <header className="absolute top-12 left-8 right-8 flex justify-between items-center">
        <button onClick={() => setView('dashboard')} className="p-2 glass rounded-xl hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold capitalize">{timerMode} Session</h2>
        <div className="w-10" />
      </header>

      <div className="relative w-72 h-72 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 288 288">
          <circle
            cx="144"
            cy="144"
            r="130"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="12"
          />
          <motion.circle
            cx="144"
            cy="144"
            r="130"
            fill="none"
            stroke={timerMode === 'focus' ? '#3B82F6' : '#10B981'}
            strokeWidth="12"
            strokeDasharray="816"
            animate={{ strokeDashoffset: 816 - (816 * progress) / 100 }}
            strokeLinecap="round"
            transition={{ duration: 1, ease: 'linear' }}
          />
        </svg>
        <div className="text-center">
          <span className="text-6xl font-bold tracking-tighter tabular-nums">
            {formatTime(timerTime)}
          </span>
        </div>
      </div>

      <div className="flex gap-6">
        <button 
          onClick={() => setIsTimerRunning(!isTimerRunning)}
          className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-xl shadow-white/10 hover:scale-105 active:scale-95 transition-transform"
        >
          {isTimerRunning ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
        </button>
        <button 
          onClick={() => {
            setIsTimerRunning(false);
            setTimerTime(timerMode === 'focus' ? 25 * 60 : 5 * 60);
          }}
          className="w-20 h-20 rounded-full glass flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <RotateCcw size={28} />
        </button>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('taskflow-pro-todos');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCategory, setSelectedCategory] = useState<Todo['category']>('Work');
  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    return localStorage.getItem('taskflow-pro-avatar');
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer State
  const [timerTime, setTimerTime] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');

  // Persistence
  useEffect(() => {
    localStorage.setItem('taskflow-pro-todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    if (profileImage) {
      localStorage.setItem('taskflow-pro-avatar', profileImage);
    }
  }, [profileImage]);

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerTime > 0) {
      interval = setInterval(() => setTimerTime(t => t - 1), 1000);
    } else if (timerTime === 0) {
      setIsTimerRunning(false);
      const nextMode = timerMode === 'focus' ? 'break' : 'focus';
      setTimerMode(nextMode);
      setTimerTime(nextMode === 'focus' ? 25 * 60 : 5 * 60);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#10B981', '#F59E0B']
      });
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerTime, timerMode]);

  // Actions
  const handleAddTodo = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const { text, dueDate } = parseSmartInput(inputValue);
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: text || "Untitled Task",
      completed: false,
      category: selectedCategory,
      dueDate,
      createdAt: Date.now(),
    };

    setTodos([newTodo, ...todos]);
    setInputValue('');
    setIsAdding(false);
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(t => {
      if (t.id === id) {
        if (!t.completed) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.8 },
            colors: ['#3B82F6', '#60A5FA', '#FFFFFF']
          });
        }
        return { ...t, completed: !t.completed };
      }
      return t;
    });
    setTodos(updated);
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-blue-500/30">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
        accept="image/*"
      />
      
      {/* Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="max-w-md mx-auto px-6 py-12 min-h-screen relative">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <Dashboard 
              key="dash" 
              todos={todos} 
              setView={setView} 
              setSelectedCategory={setSelectedCategory}
              profileImage={profileImage}
              onProfileClick={() => fileInputRef.current?.click()}
            />
          )}
          {view === 'tasks' && (
            <TaskList 
              key="tasks" 
              todos={todos} 
              setTodos={setTodos} 
              selectedCategory={selectedCategory} 
              setView={setView}
              toggleTodo={toggleTodo}
              deleteTodo={deleteTodo}
            />
          )}
          {view === 'timer' && (
            <TimerView 
              key="timer" 
              timerTime={timerTime} 
              setTimerTime={setTimerTime}
              isTimerRunning={isTimerRunning}
              setIsTimerRunning={setIsTimerRunning}
              timerMode={timerMode}
              setView={setView}
            />
          )}
        </AnimatePresence>

        {/* FAB & Modal */}
        <AnimatePresence>
          {view !== 'timer' && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAdding(true)}
              className="fixed bottom-10 right-6 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 z-50 text-white"
            >
              <Plus size={32} />
              <div className="absolute inset-0 rounded-full bg-blue-500 blur-xl opacity-20 -z-10" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAdding && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdding(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-lg glass-dark rounded-[32px] p-8 shadow-2xl"
              >
                <form onSubmit={handleAddTodo} className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">New Task</h3>
                    <div className="flex gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => setSelectedCategory(cat.name)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            selectedCategory === cat.name ? 'bg-white text-black' : 'glass text-white/40'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <input
                    autoFocus
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g., Tomorrow 10am Meeting"
                    className="w-full bg-transparent border-none text-2xl outline-none placeholder:text-white/10"
                  />
                  
                  <div className="flex justify-between items-center pt-4">
                    <p className="text-xs text-white/30">
                      Try: "Today 5pm Gym" or "Tomorrow Coffee"
                    </p>
                    <button 
                      type="submit"
                      className="px-6 py-3 bg-white text-black rounded-2xl font-bold hover:bg-white/90 transition-colors"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
