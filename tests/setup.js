/**
 * Jest global setup.
 *
 * Stubs GAS globals, then requires the pure .gs files through the custom
 * transform so every top-level function lands on global (matching the GAS
 * runtime where all functions share one global scope).
 */

// ---------------------------------------------------------------------------
// GAS global stubs
// ---------------------------------------------------------------------------
global.Logger      = { log: () => {} };
global.CardService = {}; // not tested directly; stub prevents ReferenceError
global.Utilities   = { formatDate: () => 'Mon · Jan 1' };
global.Session     = { getScriptTimeZone: () => 'UTC' };

// ---------------------------------------------------------------------------
// Load pure .gs files (gsTransform handles exports + global assignment)
// ---------------------------------------------------------------------------
require('../app-scripts/core/DigestHeader.gs');
require('../app-scripts/core/Digest.gs');
require('../app-scripts/core/VipSenders.gs');
require('../app-scripts/integrations/GeminiClient.gs');
require('../app-scripts/ui/SettingsCard.gs');
