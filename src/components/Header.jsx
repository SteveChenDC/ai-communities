import { Globe } from 'lucide-react'

export default function Header() {
  return (
    <header className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 shrink-0">
      <Globe size={20} className="text-blue-500" />
      <h1 className="text-base font-semibold text-gray-900 tracking-tight">
        AI Communities
      </h1>
    </header>
  )
}
