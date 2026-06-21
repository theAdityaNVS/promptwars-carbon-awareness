import React from 'react'
import { ActionLogForm } from '@/components/log/ActionLogForm'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LogPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const keyStr = JSON.stringify(resolvedParams)

  return (
    <div className="py-6 animate-fade-in">
      <ActionLogForm key={keyStr} />
    </div>
  )
}
