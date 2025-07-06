import React from 'react'
import { render, screen } from '@testing-library/react'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default styling', () => {
      render(<Card data-testid="card">Card Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('rounded-xl', 'border', 'bg-card', 'text-card-foreground', 'shadow')
    })

    it('applies custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Card ref={ref}>Content</Card>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardHeader', () => {
    it('renders with default styling', () => {
      render(<CardHeader data-testid="card-header">Header Content</CardHeader>)
      const header = screen.getByTestId('card-header')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
    })

    it('applies custom className', () => {
      render(<CardHeader className="custom-header" data-testid="card-header">Header</CardHeader>)
      const header = screen.getByTestId('card-header')
      expect(header).toHaveClass('custom-header')
    })
  })

  describe('CardTitle', () => {
    it('renders with default styling', () => {
      render(<CardTitle data-testid="card-title">Title Text</CardTitle>)
      const title = screen.getByTestId('card-title')
      expect(title).toBeInTheDocument()
      expect(title).toHaveClass('font-semibold', 'leading-none', 'tracking-tight')
    })

    it('applies custom className', () => {
      render(<CardTitle className="custom-title" data-testid="card-title">Title</CardTitle>)
      const title = screen.getByTestId('card-title')
      expect(title).toHaveClass('custom-title')
    })
  })

  describe('CardDescription', () => {
    it('renders with default styling', () => {
      render(<CardDescription data-testid="card-description">Description Text</CardDescription>)
      const description = screen.getByTestId('card-description')
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('text-sm', 'text-muted-foreground')
    })

    it('applies custom className', () => {
      render(<CardDescription className="custom-desc" data-testid="card-description">Description</CardDescription>)
      const description = screen.getByTestId('card-description')
      expect(description).toHaveClass('custom-desc')
    })
  })

  describe('CardContent', () => {
    it('renders with default styling', () => {
      render(<CardContent data-testid="card-content">Content Text</CardContent>)
      const content = screen.getByTestId('card-content')
      expect(content).toBeInTheDocument()
      expect(content).toHaveClass('p-6', 'pt-0')
    })

    it('applies custom className', () => {
      render(<CardContent className="custom-content" data-testid="card-content">Content</CardContent>)
      const content = screen.getByTestId('card-content')
      expect(content).toHaveClass('custom-content')
    })
  })

  describe('CardFooter', () => {
    it('renders with default styling', () => {
      render(<CardFooter data-testid="card-footer">Footer Text</CardFooter>)
      const footer = screen.getByTestId('card-footer')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
    })

    it('applies custom className', () => {
      render(<CardFooter className="custom-footer" data-testid="card-footer">Footer</CardFooter>)
      const footer = screen.getByTestId('card-footer')
      expect(footer).toHaveClass('custom-footer')
    })
  })

  describe('Complete Card Integration', () => {
    it('renders all card components together', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Test content paragraph</p>
          </CardContent>
          <CardFooter>
            <button>Test Action</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByTestId('complete-card')).toBeInTheDocument()
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
      expect(screen.getByText('Test content paragraph')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Test Action' })).toBeInTheDocument()
    })
  })
})