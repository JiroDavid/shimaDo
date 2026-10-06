import { createContext, useContext } from 'react'
import { emptyDesign, type Design } from '../../shared/design'

export const DesignContext = createContext<Design>(emptyDesign())

export function useDesignText(id: string, fallback: string): string {
  return useContext(DesignContext).overrides[id]?.text ?? fallback
}

export function EditableText({ id, fallback }: { id: string; fallback: string }) {
  return <>{useDesignText(id, fallback)}</>
}
