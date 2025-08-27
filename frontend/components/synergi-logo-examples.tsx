import React from 'react';
import { SynergiLogo } from './synergi-logo';

/**
 * Example usage of the SynergiLogo component
 * This file demonstrates different ways to use the component
 */
export const SynergiLogoExamples: React.FC = () => {
  return (
    <div className="space-y-8 p-8">
      <h2 className="text-2xl font-bold mb-4">Synergi Logo Examples</h2>
      
      {/* Default size */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Default Size (1024x1024)</h3>
        <div className="border p-4 inline-block">
          <SynergiLogo />
        </div>
      </div>

      {/* Small size */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Small Size (64x64)</h3>
        <div className="border p-4 inline-block">
          <SynergiLogo width={64} height={64} />
        </div>
      </div>

      {/* Medium size */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Medium Size (128x128)</h3>
        <div className="border p-4 inline-block">
          <SynergiLogo width={128} height={128} />
        </div>
      </div>

      {/* Large size */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Large Size (256x256)</h3>
        <div className="border p-4 inline-block">
          <SynergiLogo width={256} height={256} />
        </div>
      </div>

      {/* With custom className */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">With Custom Styling</h3>
        <div className="border p-4 inline-block">
          <SynergiLogo 
            width={100} 
            height={100} 
            className="hover:scale-110 transition-transform duration-300 cursor-pointer"
          />
        </div>
      </div>

      {/* High contrast variant */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">High Contrast Variant</h3>
        <div className="border p-4 inline-block">
          <SynergiLogo 
            width={100} 
            height={100} 
            variant="high-contrast"
            className="enhanced-contrast"
          />
        </div>
      </div>

      {/* Responsive using CSS units */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Responsive (CSS units)</h3>
        <div className="border p-4 inline-block">
          <SynergiLogo 
            width="10rem" 
            height="10rem" 
            className="md:w-32 md:h-32"
          />
        </div>
      </div>

      {/* In a flexbox layout */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">In Navigation/Header</h3>
        <div className="border p-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SynergiLogo width={40} height={40} />
              <span className="text-xl font-bold">Synergi</span>
            </div>
            <div className="space-x-4">
              <button className="px-4 py-2 bg-blue-500 text-white rounded">Login</button>
              <button className="px-4 py-2 bg-green-500 text-white rounded">Sign Up</button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default SynergiLogoExamples;
