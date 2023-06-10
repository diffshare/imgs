import './globals.css'

export const metadata = {
  title: {
    default: 'imgs',
    template: '%s - imgs',
  },
  description: 'imgs is Image Viewer on Secure Cloud Storage used end-to-end encryption.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <h1>imgs</h1>
        {children}
      </body>
    </html>
  )
}
