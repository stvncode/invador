'use client'

import * as React from 'react'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Drawer,
  DrawerContent,
  DrawerTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/useMediaQuery'

type Value = {
  value: string
  label: string
}

interface ComboBoxResponsiveProps {
  values: Value[]
}

export const ComboBoxResponsive = ({ values }: ComboBoxResponsiveProps) => {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [selectedValue, setSelectedValue] = React.useState<Value | null>(null)

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[150px] justify-start">
            {selectedValue ?
              <>{selectedValue.label}</>
            : <>+ Set status</>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <StatusList values={values} setOpen={setOpen} setSelectedValue={setSelectedValue} />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-[150px] justify-start">
          {selectedValue ?
            <>{selectedValue.label}</>
          : <>+ Set status</>}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <StatusList setOpen={setOpen} setSelectedValue={setSelectedValue} values={values} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

const StatusList = ({
  values,
  setOpen,
  setSelectedValue,
}: {
  values: Value[]
  setOpen: (open: boolean) => void
  setSelectedValue: (status: Value | null) => void
}) => {
  return (
    <Command>
      <CommandInput placeholder="Filter status..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {values.map((value) => (
            <CommandItem
              key={value.value}
              value={value.value}
              onSelect={(value) => {
                setSelectedValue(values.find((v) => v.value === value) || null)
                setOpen(false)
              }}
            >
              {value.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
