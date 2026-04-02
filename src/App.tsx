import { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import Markdown from 'react-markdown';
import { Loader2, Sparkles, Copy, Check, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface CopyResult {
  shortIntro: string;
  description: string;
}

interface HistoryItem extends CopyResult {
  id: string;
  appName: string;
  timestamp: number;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
    >
      {copied ? (
        <>
          <Check className="-ml-0.5 mr-2 h-4 w-4 text-green-500" />
          已复制
        </>
      ) : (
        <>
          <Copy className="-ml-0.5 mr-2 h-4 w-4 text-gray-400" />
          {label || '复制'}
        </>
      )}
    </button>
  );
}

export default function App() {
  const [appName, setAppName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<CopyResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('appCopywriterHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Save history on change
  useEffect(() => {
    localStorage.setItem('appCopywriterHistory', JSON.stringify(history));
  }, [history]);

  const handleGenerate = async () => {
    if (!appName.trim()) {
      setError('请输入应用名称');
      return;
    }

    setIsGenerating(true);
    setError('');
    setCurrentResult(null);

    try {
      const prompt = `你是一个专业的应用文案撰写专家。请根据用户提供的应用名称，生成以下两部分内容：

应用名称：${appName.trim()}

要求：
1. 一句话介绍：13字以内，内容简介扼要。
2. 应用简介：
   - 字数：500字左右。
   - 结构：总分总格式，条理清晰。
   - 内容：主要功能和使用特点需要分点叙述。
   - 限制：内容中绝对不能包含“最”、“精确”、“独一无二”等极致词汇。
   - 结尾：最后总写呼吁大家积极下载。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shortIntro: {
                type: Type.STRING,
                description: '13字以内的一句话介绍',
              },
              description: {
                type: Type.STRING,
                description: '500字左右的应用简介，使用Markdown格式排版',
              },
            },
            required: ['shortIntro', 'description'],
          },
        },
      });

      if (response.text) {
        const data = JSON.parse(response.text) as CopyResult;
        setCurrentResult(data);

        // Add to history
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          appName: appName.trim(),
          timestamp: Date.now(),
          shortIntro: data.shortIntro,
          description: data.description,
        };
        setHistory((prev) => [newItem, ...prev]);
      } else {
        setError('生成失败，请重试。');
      }
    } catch (err) {
      console.error(err);
      setError('生成过程中发生错误，请检查网络或稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleHistoryItem = (id: string) => {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    setExpandedHistory(new Set());
    setShowClearConfirm(false);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const ResultDisplay = ({ result, title }: { result: CopyResult; title?: string }) => (
    <div className="space-y-6">
      {title && <h3 className="text-xl font-bold text-gray-900 border-b pb-3">{title}</h3>}

      {/* 一句话介绍 */}
      <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center">
              <Sparkles className="w-4 h-4 mr-1.5 text-indigo-500" />
              一句话介绍 (13字以内)
            </h4>
            <p className="text-gray-900 font-medium text-lg leading-relaxed">{result.shortIntro}</p>
          </div>
          <div className="shrink-0 self-end sm:self-start">
            <CopyButton text={result.shortIntro} label="复制一句话" />
          </div>
        </div>
      </div>

      {/* 应用简介 */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-700">应用简介</h4>
          <div className="shrink-0 self-end sm:self-auto">
            <CopyButton text={result.description} label="复制简介" />
          </div>
        </div>
        <div className="prose prose-indigo max-w-none bg-white p-5 sm:p-6 rounded-lg border border-gray-100 shadow-sm">
          <div className="markdown-body">
            <Markdown>{result.description}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl tracking-tight">
            应用文案生成器
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            只需输入应用名称，一键生成专业的一句话介绍和应用简介。
          </p>
        </div>

        {/* Main Generator Card */}
        <div className="bg-white shadow-lg sm:rounded-2xl overflow-hidden border border-gray-100">
          <div className="px-4 py-6 sm:p-8">
            <div className="space-y-5">
              <div>
                <label htmlFor="appName" className="block text-sm font-medium text-gray-700 mb-1">
                  应用名称
                </label>
                <div className="mt-1 flex rounded-lg shadow-sm">
                  <input
                    type="text"
                    name="appName"
                    id="appName"
                    className="flex-1 min-w-0 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-base transition-colors"
                    placeholder="例如：微信、抖音、支付宝"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleGenerate();
                      }
                    }}
                  />
                </div>
                {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !appName.trim()}
                className="w-full inline-flex justify-center items-center px-4 py-3.5 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    正在为您生成专属文案...
                  </>
                ) : (
                  <>
                    <Sparkles className="-ml-1 mr-2 h-5 w-5" />
                    一键生成文案
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Current Result */}
          {currentResult && (
            <div className="border-t border-gray-100 bg-white px-4 py-6 sm:p-8 transition-all duration-500 ease-in-out">
              <ResultDisplay result={currentResult} title="✨ 最新生成结果" />
            </div>
          )}
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="bg-white shadow-lg sm:rounded-2xl overflow-hidden border border-gray-100">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-lg leading-6 font-semibold text-gray-900">历史记录</h3>
                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {history.length} 条
                </span>
              </div>
              
              {showClearConfirm ? (
                <div className="flex items-center gap-3 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">
                  <span className="text-sm text-red-800 font-medium">确定清空？</span>
                  <button onClick={clearHistory} className="text-sm text-red-600 hover:text-red-700 font-bold">确定</button>
                  <button onClick={() => setShowClearConfirm(false)} className="text-sm text-gray-500 hover:text-gray-700">取消</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  清空历史
                </button>
              )}
            </div>
            <ul className="divide-y divide-gray-100">
              {history.map((item) => {
                const isExpanded = expandedHistory.has(item.id);
                const date = new Date(item.timestamp).toLocaleString('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <li key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <div
                      className="px-4 py-4 sm:px-6 cursor-pointer flex items-center justify-between group"
                      onClick={() => toggleHistoryItem(item.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <span className="font-bold text-indigo-600 text-lg truncate">{item.appName}</span>
                        <span className="text-sm text-gray-400 whitespace-nowrap">{date}</span>
                        {!isExpanded && (
                          <span className="text-sm text-gray-500 truncate hidden sm:block flex-1">
                            - {item.shortIntro}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <button
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className="text-gray-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="删除此记录"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="p-1 text-gray-400 group-hover:text-indigo-500 transition-colors">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-6 sm:px-6 animate-in slide-in-from-top-2 duration-200">
                        <ResultDisplay result={item} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
