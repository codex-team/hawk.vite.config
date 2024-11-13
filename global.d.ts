declare global {
  /**
   * For Browser invironment
   */
  interface Window {
    /**
     * Hawk release identifier
     */
    HAWK_RELEASE: string;
  }

  /**
   * For Node.js environmebt
   */
  namespace NodeJS {
    interface Global {
      /**
       * Hawk Relese identifier
       */
      HAWK_RELEASE: string;
    }
  }
}

export {};
