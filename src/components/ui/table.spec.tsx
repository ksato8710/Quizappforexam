import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from './table'

describe('Table component', () => {
  it('renders children inside <table> (header and body)', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ヘッダー</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>セル</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    // Header should be present
    expect(screen.getByText('ヘッダー')).toBeInTheDocument()

    // Body cell should be present
    const row = screen.getByRole('row', { name: /セル/ })
    expect(within(row).getByText('セル')).toBeInTheDocument()
  })
})
