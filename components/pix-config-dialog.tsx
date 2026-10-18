'use client'

import { useState, useEffect } from 'react'
import { QrCode, Check, Copy, MessageSquareText, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getStorePixConfig,
  setStorePixConfig,
  formatWhatsAppDebtReminder,
  type PixKeyType,
  type StorePixConfig,
} from '@/lib/pix-config'

const PIX_TYPES: PixKeyType[] = ['CNPJ', 'CPF', 'Celular', 'E-mail', 'Aleatória']

/**
 * Dialog component to configure the store's Pix key credentials
 * and preview how WhatsApp payment reminders will appear to customers.
 *
 * @param props Contains dialog open state and state toggle callback.
 * @returns The rendered React element.
 */
export function PixConfigDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [config, setConfig] = useState<StorePixConfig>({
    key: '',
    type: 'CNPJ',
    beneficiary: 'Amo Fit',
    city: '',
  })
  const [copiedPreview, setCopiedPreview] = useState(false)

  useEffect(() => {
    if (open) {
      setConfig(getStorePixConfig())
    }
  }, [open])

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setStorePixConfig(config)
    toast.success('Chave Pix configurada com sucesso!')
    onOpenChange(false)
  }

  const sampleReminder = formatWhatsAppDebtReminder({
    customerName: 'Mei',
    itemsDescription: '1x Conjunto List (M) + 1x Conjunto Raise (M)',
    totalAmount: 250,
    amountPaid: 50,
    remainingAmount: 200,
  })

  function handleCopyPreview() {
    navigator.clipboard.writeText(sampleReminder)
    setCopiedPreview(true)
    toast.success('Exemplo de mensagem copiado!')
    setTimeout(() => setCopiedPreview(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-emerald-700 dark:text-emerald-400">
                Chave Pix da Loja
              </DialogTitle>
              <DialogDescription>
                A chave cadastrada será inserida automaticamente nas cobranças de WhatsApp.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5 sm:col-span-1">
              <Label className="text-xs font-bold">Tipo da Chave</Label>
              <Select
                value={config.type}
                onValueChange={(val) =>
                  setConfig((prev) => ({ ...prev, type: val as PixKeyType }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIX_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="pix-key" className="text-xs font-bold">
                Chave Pix
              </Label>
              <Input
                id="pix-key"
                value={config.key}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, key: e.target.value }))
                }
                placeholder={
                  config.type === 'CNPJ'
                    ? '00.000.000/0001-00'
                    : config.type === 'Celular'
                    ? '(00) 90000-0000'
                    : config.type === 'E-mail'
                    ? 'financeiro@amofit.com'
                    : 'Digite sua chave Pix'
                }
                className="h-9 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pix-beneficiary" className="text-xs font-bold">
                Titular / Favorecido
              </Label>
              <Input
                id="pix-beneficiary"
                value={config.beneficiary || ''}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, beneficiary: e.target.value }))
                }
                placeholder="Ex: Amo Fit Moda Fitness"
                className="h-9 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pix-city" className="text-xs font-bold">
                  Cidade da Conta
                </Label>
                <span className="text-[10px] text-muted-foreground font-medium">Opcional</span>
              </div>
              <Input
                id="pix-city"
                value={config.city || ''}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, city: e.target.value }))
                }
                placeholder="Ex: São Paulo"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <MessageSquareText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Prévia da Mensagem no WhatsApp:</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyPreview}
                className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
              >
                {copiedPreview ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedPreview ? 'Copiado' : 'Copiar'}</span>
              </Button>
            </div>

            <div className="rounded-lg bg-card border border-border p-3 text-xs font-sans whitespace-pre-line text-foreground/90 leading-relaxed select-all">
              {sampleReminder}
            </div>

            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>A chave Pix fica em linha exclusiva para permitir que a cliente toque e copie com 1 toque no celular.</span>
            </p>
          </div>

          <DialogFooter className="mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              Salvar Chave Pix
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
