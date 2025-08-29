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
          className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      )
    }

    // Extract language from className (e.g., "language-python" -> "python")
    // Handle cases where className might contain multiple values like "hljs language-python"
    const extractLanguage = (cls: string): string => {
      if (!cls) return ''
      
      // Look for language- prefix
      const languageMatch = cls.match(/language-(\w+)/)
      if (languageMatch) {
        return languageMatch[1]
      }
      
      // Fallback: look for common language names
      const commonLanguages = ['javascript', 'python', 'typescript', 'java', 'cpp', 'c', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'html', 'css', 'sql', 'bash', 'shell', 'json', 'xml', 'yaml', 'toml']
      for (const lang of commonLanguages) {
        if (cls.toLowerCase().includes(lang)) {
          return lang
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

    // If no proper language is detected and content doesn't look like code, render as normal text
    if (!language && (!code || code.length < 10 || !/[{}();[\]<>]/.test(code))) {
      return (
        <span className="text-teal-600 dark:text-teal-400 font-medium bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded">
          {children}
        </span>
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
      <div className="relative group my-4">
        {/* Language label and copy button */}
        <div className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 text-gray-300 text-xs px-4 py-2 rounded-t-lg border-b border-gray-700">
          <span className="font-medium capitalize">{language || 'code'}</span>
          <Button
            onClick={copyToClipboard}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
        
        {/* Code content */}
        <div className="bg-gray-900 dark:bg-black rounded-b-lg overflow-x-auto">
          <pre className="!bg-transparent !m-0 p-4 text-sm leading-relaxed">
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
    )
  },
  
  // Style other markdown elements
  h1: ({ children, ...props }: any) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-white" {...props}>
      {children}
    </h1>
  ),
  
  h2: ({ children, ...props }: any) => (
    <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-white" {...props}>
      {children}
    </h2>
  ),
  
  h3: ({ children, ...props }: any) => (
    <h3 className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-white" {...props}>
      {children}
    </h3>
  ),
  
  p: ({ children, ...props }: any) => (
    <p className="mb-4 leading-relaxed text-gray-800 dark:text-gray-200" {...props}>
      {children}
    </p>
  ),
  
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc list-inside mb-4 space-y-1 text-gray-800 dark:text-gray-200" {...props}>
      {children}
    </ul>
  ),
  
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-800 dark:text-gray-200" {...props}>
      {children}
    </ol>
  ),
  
  li: ({ children, ...props }: any) => (
    <li className="mb-1" {...props}>
      {children}
    </li>
  ),
  
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </blockquote>
  ),
  
  strong: ({ children, ...props }: any) => (
    <strong className="font-bold text-gray-900 dark:text-white" {...props}>
      {children}
    </strong>
  ),
  
  em: ({ children, ...props }: any) => (
    <em className="italic text-gray-800 dark:text-gray-200" {...props}>
      {children}
    </em>
  ),
  
  a: ({ children, href, ...props }: any) => (
    <a 
      href={href}
      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border border-gray-300 dark:border-gray-600" {...props}>
        {children}
      </table>
    </div>
  ),
  
  th: ({ children, ...props }: any) => (
    <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left font-semibold text-gray-900 dark:text-white" {...props}>
      {children}
    </th>
  ),
  
  td: ({ children, ...props }: any) => (
    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-800 dark:text-gray-200" {...props}>
      {children}
    </td>
  ),
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ 
  content, 
  className = "" 
}) => {
  return (
    <div className={`markdown-message max-w-none ${className}`}>
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