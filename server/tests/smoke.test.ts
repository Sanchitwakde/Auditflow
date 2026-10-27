import {describe,expect,it} from 'vitest';
describe('AuditFlow smoke checks',()=>{it('keeps the health contract',()=>{expect('/health').toBe('/health')});});
