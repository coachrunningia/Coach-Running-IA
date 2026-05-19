import { readFileSync, writeFileSync } from 'fs';
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.nullValue!==undefined)return null;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}

const userRaw = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/audit-thomas-user.json'));
const planRaw = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/audit-thomas-plan.json'));
const user = pf(userRaw.fields);
const plan = pf(planRaw.fields);
writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-thomas-user-parsed.json', JSON.stringify(user, null, 2));
writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-thomas-plan-parsed.json', JSON.stringify(plan, null, 2));

console.log('=== USER ===');
console.log('ID:', user.id);
console.log('Email:', user.email);
console.log('Premium:', user.isPremium, '| paidAt:', user.paidAt, '| premiumSince:', user.premiumSince);
console.log('Created:', user.createdAt);
const q = user.questionnaireData || {};
console.log('--- Questionnaire ---');
console.log('Goal/SubGoal:', q.goal, '/', q.subGoal);
console.log('Level:', q.level);
console.log('TargetTime:', q.targetTime, '| RaceDate:', q.raceDate);
console.log('StartDate:', q.startDate);
console.log('Frequency:', q.frequency);
console.log('CurrentVol:', q.currentWeeklyVolume);
console.log('Sex/Age/W/H:', q.sex, '/', q.age, '/', q.weight, '/', q.height);
console.log('PB:', JSON.stringify(q.recentRaceTimes));
console.log('Injuries:', JSON.stringify(q.injuries));
console.log('City:', q.city);
console.log('Comments:', q.comments);
console.log('Preferred days:', q.preferredDays);

console.log('\n=== PLAN ===');
console.log('ID:', plan.id, '| Name:', plan.name);
console.log('Created:', plan.createdAt, '| Updated:', plan.updatedAt);
console.log('FullPlanGenerated:', plan.fullPlanGenerated);
console.log('VMA:', plan.vma, '| Sessions/wk:', plan.sessionsPerWeek);
console.log('TotalWeeks:', plan.totalWeeks, '| weeks.length:', (plan.weeks || []).length);
console.log('--- Paces ---');
console.log(JSON.stringify(plan.paces, null, 2));
console.log('--- Feasibility ---');
console.log(JSON.stringify(plan.feasibility, null, 2));
console.log('--- WelcomeMessage ---');
console.log(plan.welcomeMessage);
console.log('--- generationContext keys ---');
const gc = plan.generationContext || {};
console.log(Object.keys(gc));
console.log('modelUsed:', gc.modelUsed);
console.log('promptVersion:', gc.promptVersion);
console.log('--- periodizationPlan ---');
console.log(JSON.stringify(gc.periodizationPlan, null, 2)?.slice(0, 2000));
