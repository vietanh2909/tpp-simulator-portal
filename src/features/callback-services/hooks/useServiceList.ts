import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/ui'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { callbackServicesApi } from '../api/callback-services.api'
import type { CallbackService, ServiceStatusFilter } from '../types/callback-services.types'
import { filterServices } from '../utils/service-filter'

interface UseServiceListOptions {
  /**
   * Gọi sau khi xóa thành công, hộp thoại đã đóng và danh sách đã tải lại (dòng vừa xóa đã gỡ).
   * Nơi gọi đưa tiêu điểm về chỗ còn tồn tại: nút đã mở hộp thoại không còn trên trang.
   */
  onDeleted?: () => void
}

export function useServiceList({ onDeleted }: UseServiceListOptions = {}) {
  const toast = useToast()
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<ServiceStatusFilter>('all')
  const [pendingCode, setPendingCode] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CallbackService | null>(null)
  const [deleting, setDeleting] = useState(false)
  const search = useDebouncedValue(searchInput, 250)
  // Đặt khi xóa thành công, xử lý ở effect dưới sau khi hộp thoại đã đóng và lượt tải lại đã xong.
  const deletedPendingFocus = useRef(false)

  // Backend không có tham số tìm kiếm hay lọc nên tải một lần rồi lọc ở client.
  const list = useAsyncData(() => callbackServicesApi.list(), [])
  const items = useMemo(() => filterServices(list.data?.items ?? [], search, status), [list.data, search, status])

  // Chạy sau khi ConfirmDialog trả tiêu điểm về nút cũ (cleanup của con chạy trước effect của cha) và sau khi danh sách
  // tải lại xong, để tiêu điểm không rơi vào dòng đã bị gỡ.
  const refreshing = list.refreshing
  useEffect(() => {
    if (!deletedPendingFocus.current || deleteTarget !== null || refreshing) return
    deletedPendingFocus.current = false
    onDeleted?.()
  }, [deleteTarget, refreshing, list.data, onDeleted])

  /** Trạng thái hiển thị chỉ đổi sau khi server xác nhận (AC2.7.3). */
  async function toggleEnabled(service: CallbackService, enabled: boolean) {
    setPendingCode(service.code)
    try {
      await callbackServicesApi.setEnabled(service.code, enabled)
      toast.show(`Đã ${enabled ? 'bật' : 'tắt'} dịch vụ "${service.code}".`)
      list.reload()
    } catch {
      toast.show(`Không đổi được trạng thái của ${service.code}. Thử lại.`, 'error')
    } finally {
      setPendingCode(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleting(true)
    try {
      await callbackServicesApi.remove(target.code)
      toast.show(`Đã xóa dịch vụ "${target.code}".`)
      deletedPendingFocus.current = true
      setDeleteTarget(null)
      list.reload()
    } catch {
      toast.show(`Không xóa được ${target.code}. Thử lại.`, 'error')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  function clearFilters() {
    setSearchInput('')
    setStatus('all')
  }

  return {
    list,
    items,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    pendingCode,
    toggleEnabled,
    deleteTarget,
    requestDelete: setDeleteTarget,
    cancelDelete: () => setDeleteTarget(null),
    confirmDelete,
    deleting,
    clearFilters,
  }
}
