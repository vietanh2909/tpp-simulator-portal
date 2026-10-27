import { useState } from 'react'
import { Button, Icon, Input } from '@/components/ui'
import { isSensitiveHeader } from '../utils/mask-headers'

export interface HeaderRow {
  id: number
  name: string
  value: string
}

interface HeadersEditorProps {
  rows: HeaderRow[]
  onChange: (rows: HeaderRow[]) => void
  onAdd: () => void
  /** Tên header API key của dịch vụ (có thể tùy biến, ví dụ `X-Partner`): luôn được che dù tên không khớp mẫu chung. */
  apiKeyHeader?: string | undefined
}

function HeaderValueInput({
  row,
  apiKeyHeader,
  onValueChange,
}: {
  row: HeaderRow
  apiKeyHeader: string | undefined
  onValueChange: (value: string) => void
}) {
  const sensitive = isSensitiveHeader(row.name, apiKeyHeader)
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="relative flex-1">
      <Input
        mono
        aria-label={`Giá trị header ${row.name || 'mới'}`}
        type={sensitive && !revealed ? 'password' : 'text'}
        autoComplete="off"
        value={row.value}
        onChange={(event) => onValueChange(event.target.value)}
        className={sensitive ? 'pr-9' : undefined}
      />
      {sensitive && (
        <button
          type="button"
          aria-label={revealed ? 'Ẩn giá trị' : 'Hiện giá trị'}
          onClick={() => setRevealed((current) => !current)}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
        >
          <Icon name={revealed ? 'visibility_off' : 'visibility'} size={18} />
        </button>
      )}
    </div>
  )
}

/** Soạn header cho callback thử. Giá trị của header nhạy cảm được che mặc định. */
export function HeadersEditor({ rows, onChange, onAdd, apiKeyHeader }: HeadersEditorProps) {
  function update(id: number, patch: Partial<HeaderRow>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          <Input
            mono
            aria-label="Tên header"
            placeholder="Tên header"
            value={row.name}
            onChange={(event) => update(row.id, { name: event.target.value })}
            className="w-56 shrink-0"
          />
          <HeaderValueInput
            row={row}
            apiKeyHeader={apiKeyHeader}
            onValueChange={(value) => update(row.id, { value })}
          />
          <button
            type="button"
            aria-label={`Xóa header ${row.name || 'mới'}`}
            onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
          >
            <Icon name="delete" size={18} />
          </button>
        </div>
      ))}
      <div>
        <Button size="sm" variant="tonal" icon="add" onClick={onAdd}>
          Thêm header
        </Button>
      </div>
    </div>
  )
}
