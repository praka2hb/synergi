"use client"

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Import highlight.js styles for dark theme
import 'highlight.js/styles/github-dark.css'

interface MarkdownMessageProps {
  content: string
  className?: string
}

// Custom components for markdown rendering
const markdownComponents = {
  code: ({ node, inline, className, children, ...props }: any) => {
    const [copied, setCopied] = useState(false)
    
    if (inline) {
      return (
        <code 
          className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-md text-sm font-mono border border-gray-300 dark:border-gray-600 shadow-sm"
          {...props}
        >
          {children}
        </code>
      )
    }

    // Extract language from className (e.g., "language-python" -> "py")
    // Handle cases where className might contain multiple values like "hljs language-python"
    const extractLanguage = (cls: string): string => {
      if (!cls) return ''
      
      // Language abbreviations mapping
      const languageAbbreviations: { [key: string]: string } = {
        'javascript': 'js',
        'python': 'py',
        'typescript': 'ts',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'go': 'go',
        'rust': 'rs',
        'php': 'php',
        'ruby': 'rb',
        'swift': 'swift',
        'kotlin': 'kt',
        'scala': 'scala',
        'html': 'html',
        'css': 'css',
        'sql': 'sql',
        'bash': 'bash',
        'shell': 'sh',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'toml': 'toml'
      }
      
      // Look for language- prefix
      const languageMatch = cls.match(/language-(\w+)/)
      if (languageMatch) {
        const fullLang = languageMatch[1].toLowerCase()
        return languageAbbreviations[fullLang] || languageMatch[1]
      }
      
      // Fallback: look for common language names
      const commonLanguages = Object.keys(languageAbbreviations)
      for (const lang of commonLanguages) {
        if (cls.toLowerCase().includes(lang)) {
          return languageAbbreviations[lang] || lang
        }
      }
      
      return ''
    }
    
    const language = extractLanguage(className || '')
    
    // Extract plain text from children - improved to handle complex nested structures
    const getTextContent = (node: any): string => {
      if (typeof node === 'string') {
        return node
      }
      if (typeof node === 'number') {
        return String(node)
      }
      if (Array.isArray(node)) {
        return node.map(getTextContent).join('')
      }
      if (React.isValidElement(node)) {
        if (node.props && typeof node.props === 'object' && node.props !== null && 'children' in node.props) {
          return getTextContent((node.props as any).children)
        }
      }
      return ''
    }

    const code = getTextContent(children).trim()

    // Enhanced function to determine if content should be rendered as a code block
    const shouldRenderAsCodeBlock = (codeText: string, hasLanguage: boolean): boolean => {
      // If language is explicitly specified, always render as code block
      if (hasLanguage) return true
      
      // If content is too short, likely inline code
      if (codeText.length < 15) return false
      
      // If content is very long, likely a code block
      if (codeText.length > 100) return true
      
      // Count programming symbols
      const symbolCount = (codeText.match(/[{}();[\]<>]/g) || []).length
      const symbolRatio = symbolCount / codeText.length
      
      // If very few symbols relative to length, likely not code
      if (symbolRatio < 0.1) return false
      
      // Check for code-like patterns
      const hasFunctionDeclaration = /\b(function|def|class|const|let|var)\b/.test(codeText)
      const hasControlFlow = /\b(if|for|while|return|try|catch)\b/.test(codeText)
      const hasOperators = /[=!<>+\-*/&|%]/.test(codeText)
      const hasMultipleStatements = (codeText.match(/[;{}]/g) || []).length > 2
      
      // If it has multiple code indicators, likely a code block
      const codeIndicators = [hasFunctionDeclaration, hasControlFlow, hasOperators, hasMultipleStatements].filter(Boolean).length
      
      // Require at least 2 code indicators for code block treatment
      return codeIndicators >= 2
    }

    // If content shouldn't be rendered as code block, render as inline code
    if (!shouldRenderAsCodeBlock(code, !!language)) {
      return (
        <code 
          className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-md text-sm font-mono border border-gray-300 dark:border-gray-600 shadow-sm"
          {...props}
        >
          {children}
        </code>
      )
    }

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy code:', err)
      }
    }

    return (
      <div className="relative group my-6">
        {/* Enhanced language label and copy button */}
        <div className="flex items-center justify-between bg-gray-900 dark:bg-black text-gray-200 text-xs px-3 py-2 rounded-t-lg border-b border-gray-700 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-mono font-normal tracking-wide text-xs">{language || "code"}</span>
          </div>
          <Button
            onClick={copyToClipboard}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-gray-800 text-gray-400 hover:text-white transition-all duration-200 rounded-md"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        
        {/* Enhanced code content with better styling */}
        <div className="bg-black dark:bg-black rounded-b-lg overflow-hidden shadow-xl border border-gray-700">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            <pre className="!bg-transparent !m-0 p-5 text-sm leading-relaxed">
              <code 
                className={`${className} block font-mono text-gray-100`} 
                style={{ whiteSpace: 'pre', display: 'block' }}
                {...props}
              >
                {children}
              </code>
            </pre>
          </div>
        </div>
      </div>
    )
  },
  
  // Enhanced text styling for better readability
  h1: ({ children, ...props }: any) => (
    <h1 className="text-3xl font-bold mt-8 mb-6 text-slate-900 dark:text-white leading-tight border-b border-slate-200 dark:border-slate-700 pb-3" {...props}>
      {children}
    </h1>
  ),
  
  h2: ({ children, ...props }: any) => (
    <h2 className="text-2xl font-bold mt-7 mb-4 text-slate-900 dark:text-white leading-tight" {...props}>
      {children}
    </h2>
  ),
  
  h3: ({ children, ...props }: any) => (
    <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-900 dark:text-white leading-tight" {...props}>
      {children}
    </h3>
  ),
  
  h4: ({ children, ...props }: any) => (
    <h4 className="text-lg font-semibold mt-5 mb-3 text-slate-900 dark:text-white leading-tight" {...props}>
      {children}
    </h4>
  ),
  
  h5: ({ children, ...props }: any) => (
    <h5 className="text-base font-semibold mt-4 mb-2 text-slate-900 dark:text-white leading-tight" {...props}>
      {children}
    </h5>
  ),
  
  h6: ({ children, ...props }: any) => (
    <h6 className="text-sm font-semibold mt-4 mb-2 text-slate-900 dark:text-white leading-tight uppercase tracking-wide" {...props}>
      {children}
    </h6>
  ),
  
  p: ({ children, ...props }: any) => (
    <p className="mb-5 leading-relaxed text-slate-700 dark:text-slate-300 text-base" {...props}>
      {children}
    </p>
  ),
  
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc list-inside mb-5 space-y-2 text-slate-700 dark:text-slate-300 ml-4" {...props}>
      {children}
    </ul>
  ),
  
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal list-inside mb-5 space-y-2 text-slate-700 dark:text-slate-300 ml-4" {...props}>
      {children}
    </ol>
  ),
  
  li: ({ children, ...props }: any) => (
    <li className="mb-1 leading-relaxed" {...props}>
      {children}
    </li>
  ),
  
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-4 border-gray-400 dark:border-gray-600 pl-6 my-6 italic text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 py-4 pr-4 rounded-r-lg" {...props}>
      {children}
    </blockquote>
  ),
  
  strong: ({ children, ...props }: any) => (
    <strong className="font-bold text-slate-900 dark:text-white" {...props}>
      {children}
    </strong>
  ),
  
  em: ({ children, ...props }: any) => (
    <em className="italic text-slate-600 dark:text-slate-400 font-medium" {...props}>
      {children}
    </em>
  ),
  
  a: ({ children, href, ...props }: any) => (
    <a 
      href={href}
      className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 underline decoration-2 underline-offset-2 hover:decoration-gray-500 transition-colors font-medium"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700" {...props}>
        {children}
      </table>
    </div>
  ),
  
  th: ({ children, ...props }: any) => (
    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700" {...props}>
      {children}
    </th>
  ),
  
  td: ({ children, ...props }: any) => (
    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700" {...props}>
      {children}
    </td>
  ),
  
  hr: ({ ...props }: any) => (
    <hr className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" {...props} />
  ),
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ 
  content, 
  className = "" 
}) => {
  return (
    <div className={`markdown-message max-w-none prose prose-slate dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownMessage