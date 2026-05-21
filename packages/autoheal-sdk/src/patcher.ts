export interface PatchInfo {
  id: string;
  type: 'css' | 'js';
  target: string;
  code: string;
  timestamp: string;
}

export class Patcher {
  private appliedPatches: PatchInfo[] = [];
  private originalJSBackups: Map<string, any> = new Map();

  constructor() {}

  /**
   * Dynamically inject CSS into the DOM
   */
  public injectCSS(patchId: string, cssCode: string): boolean {
    try {
      const styleId = `autoheal-style-${patchId}`;
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;

      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }

      styleElement.textContent = cssCode;

      // Track patch
      const existing = this.appliedPatches.find(p => p.id === patchId);
      if (!existing) {
        this.appliedPatches.push({
          id: patchId,
          type: 'css',
          target: 'DOM Head Stylesheet',
          code: cssCode,
          timestamp: new Date().toISOString(),
        });
      } else {
        existing.code = cssCode;
        existing.timestamp = new Date().toISOString();
      }

      return true;
    } catch (e) {
      console.error('__autoheal_internal__ Error injecting CSS patch:', e);
      return false;
    }
  }

  /**
   * Safely override a function on window/objects or evaluate scripts
   */
  public overrideFunction(patchId: string, targetPath: string, healingFunction: Function): boolean {
    try {
      const parts = targetPath.split('.');
      let obj: any = window;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) {
          obj[parts[i]] = {};
        }
        obj = obj[parts[i]];
      }

      const funcName = parts[parts.length - 1];
      const originalPath = `backup_${patchId}_${targetPath}`;

      if (!this.originalJSBackups.has(originalPath)) {
        this.originalJSBackups.set(originalPath, obj[funcName]);
      }

      // Perform override
      obj[funcName] = healingFunction;

      // Track patch
      this.appliedPatches.push({
        id: patchId,
        type: 'js',
        target: targetPath,
        code: healingFunction.toString(),
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (e) {
      console.error('__autoheal_internal__ Error applying JS function override:', e);
      return false;
    }
  }

  /**
   * Remove a patch by id (restores original functionality or style)
   */
  public removePatch(patchId: string): boolean {
    try {
      const patchIndex = this.appliedPatches.findIndex(p => p.id === patchId);
      if (patchIndex === -1) return false;

      const patch = this.appliedPatches[patchIndex];

      if (patch.type === 'css') {
        const styleId = `autoheal-style-${patchId}`;
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
          styleElement.remove();
        }
      } else if (patch.type === 'js') {
        // Restore backup JS function
        const parts = patch.target.split('.');
        let obj: any = window;
        
        for (let i = 0; i < parts.length - 1; i++) {
          obj = obj[parts[i]];
        }
        
        const funcName = parts[parts.length - 1];
        const originalPath = `backup_${patchId}_${patch.target}`;
        
        if (this.originalJSBackups.has(originalPath)) {
          obj[funcName] = this.originalJSBackups.get(originalPath);
          this.originalJSBackups.delete(originalPath);
        }
      }

      this.appliedPatches.splice(patchIndex, 1);
      return true;
    } catch (e) {
      console.error('__autoheal_internal__ Error removing patch:', e);
      return false;
    }
  }

  public getAppliedPatches(): PatchInfo[] {
    return [...this.appliedPatches];
  }
}
export const patcherInstance = new Patcher();
