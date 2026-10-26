import ta from './locales/ta.json' with { type: 'json' };
import hi from './locales/hi.json' with { type: 'json' };
import es from './locales/es.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };
import de from './locales/de.json' with { type: 'json' };
import pt from './locales/pt.json' with { type: 'json' };
import ar from './locales/ar.json' with { type: 'json' };
import zh from './locales/zh.json' with { type: 'json' };
import ja from './locales/ja.json' with { type: 'json' };
import ko from './locales/ko.json' with { type: 'json' };
import ru from './locales/ru.json' with { type: 'json' };
import it from './locales/it.json' with { type: 'json' };
import nl from './locales/nl.json' with { type: 'json' };
import tr from './locales/tr.json' with { type: 'json' };
import id from './locales/id.json' with { type: 'json' };
import vi from './locales/vi.json' with { type: 'json' };
import pl from './locales/pl.json' with { type: 'json' };
import uk from './locales/uk.json' with { type: 'json' };
import th from './locales/th.json' with { type: 'json' };
import {additionalDictionaries} from './additionalDictionaries.js';
const catalogs = { ta, hi, es, fr, de, pt, ar, zh, ja, ko, ru, it, nl, tr, id, vi, pl, uk, th };
const modeHeadings = {
  ta:'அணுகல்தன்மை பயன்முறைகள்', hi:'सुलभता मोड', es:'Modos de accesibilidad',
  fr:'Modes d’accessibilité', de:'Barrierefreiheitsmodi', pt:'Modos de acessibilidade',
  ar:'أوضاع إمكانية الوصول', zh:'无障碍模式', ja:'アクセシビリティモード', ko:'접근성 모드',
  ru:'Режимы доступности', it:'Modalità di accessibilità', nl:'Toegankelijkheidsmodi',
  tr:'Erişilebilirlik modları', id:'Mode aksesibilitas', vi:'Chế độ trợ năng',
  pl:'Tryby dostępności', uk:'Режими доступності', th:'โหมดการช่วยเหลือพิเศษ',
};
// Reuse each catalog's feature names for the promoted modes and their search aliases.
export const panelDictionaries = Object.fromEntries(Object.entries(catalogs).map(([code,entries])=>[code,{
  ...entries,
  ...additionalDictionaries[code],
  'Accessibility modes':modeHeadings[code],
  'Dyslexia Mode':entries['Dyslexia-Friendly Font'],
  'Voice Command':entries['Voice Commands'],
  'Text to Speech':entries['Text-to-Speech'],
  'Color Blindness Mode':entries['Color Blindness Support'],
  'Brightness mode':entries['Brightness, contrast and saturation'],
}]));
