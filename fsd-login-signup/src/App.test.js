import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login heading', () => {
  render(<App />);
  const headingElement = screen.getByRole('heading', { name: /^login$/i }); // { name: /login/i }); to  { name: /^login$/i }); change by lakhan
  expect(headingElement).toBeInTheDocument();
});
