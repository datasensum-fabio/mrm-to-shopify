import './globals.css';

export const metadata = {
  title: 'MRM CSV Transformer',
  description: 'Upload and transform MRM product catalog CSV files',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
