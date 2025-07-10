import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-gray-900 tracking-tight">HBM</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Huezo Business Management - Garment Manufacturing Order Management System
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-2xl mb-3">👥</div>
              <h3 className="font-semibold text-gray-900 mb-2">Customer Management</h3>
              <p className="text-gray-600 text-sm">Complete customer profiles with order history</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-2xl mb-3">📦</div>
              <h3 className="font-semibold text-gray-900 mb-2">Order Processing</h3>
              <p className="text-gray-600 text-sm">End-to-end order lifecycle management</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-2xl mb-3">📊</div>
              <h3 className="font-semibold text-gray-900 mb-2">Inventory Tracking</h3>
              <p className="text-gray-600 text-sm">Real-time inventory management</p>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-white rounded-lg p-6 shadow-md mt-8">
            <h3 className="font-semibold text-gray-900 mb-4">Built with Modern Technologies</h3>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Next.js 15
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                TypeScript
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Tailwind CSS
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                shadcn/ui
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Drizzle ORM
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                NextAuth.js
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center mt-8">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
            <Button variant="outline" size="lg" className="px-8">
              View Documentation
            </Button>
          </div>

          {/* Development Status */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-8">
            <p className="text-yellow-800 text-sm">
              🚧 <strong>Development Status:</strong> This project is currently in active
              development. Check the{' '}
              <a
                href="https://github.com/gokuzhan/hbm-svc/issues"
                className="underline font-medium"
              >
                GitHub Issues
              </a>{' '}
              for current progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
