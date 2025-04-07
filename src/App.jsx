import { useState } from 'react';

export default function App() {
  
  const [routineStep, setRoutineStep] = useState(1);

  const updateRoutineStep = (tag) => {
    const match = tag.match(/([bp])(\d)([wl])/);
    if (!match) return;
    const [, , step, result] = match;
    const stepNum = parseInt(step);
    if (result === 'w') {
      if (stepNum < 3) {
        setRoutineStep(stepNum + 1);
      } else {
        setRoutineStep(1); // reset on 3w
      }
    } else if (result === 'l') {
      setRoutineStep(stepNum); // 유지
    }
  };

  const [results, setResults] = useState([]);
  const [decision, setDecision] = useState('');
  const [mode, setMode] = useState('보수형');
  const [wins, setWins] = useState(0);
  const [fails, setFails] = useState(0);
  const [comp, setComp] = useState(0);
  const [profit, setProfit] = useState(0);
  const [seed, setSeed] = useState(0);
  const [step1, setStep1] = useState(0);
  const [step2, setStep2] = useState(0);
  const [step3, setStep3] = useState(0);
  const [compPerRoutine, setCompPerRoutine] = useState(0);
  const today = new Date().toISOString().split('T')[0];

  const handleAddResult = (value) => {
    const updated = [...results, { type: '관망', value, date: today }].slice(-100);
    setResults(updated);
    evaluate(updated.map(r => r.value));
  };

  const handleEntry = (value, step) => {
    const updated = [...results, { type: '진입', value, step, date: today }].slice(-100);
    setResults(updated);
    evaluate(updated.map(r => r.value));
  };

  
  
  const handleWin = () => {
    const lastEntry = [...results].reverse().find(r => r.type === '진입');
    if (lastEntry) {
      let amount = step1;
      if (lastEntry.step === 2) amount = step2;
      if (lastEntry.step === 3) amount = step3;
      const isBanker = lastEntry.value === 'b';
      const winAmount = isBanker ? amount * 0.95 : amount;
      setProfit(profit + winAmount);
      setComp(comp + (compPerRoutine * amount) / 100);
    }
    setWins(wins + 1);
  };



  
  
  const handleFail = () => {
    const lastEntry = [...results].reverse().find(r => r.type === '진입');
    if (lastEntry) {
      let amount = step1;
      if (lastEntry.step === 2) amount = step2;
      if (lastEntry.step === 3) amount = step3;
      const outcome = lastEntry.value === 'b' ? 'p' : lastEntry.value === 'p' ? 'b' : 't';
      const updated = [...results, { type: '관망', value: outcome }];
      setResults(updated.slice(-100));
      setProfit(profit - amount);
      setComp(comp + (compPerRoutine * amount) / 100);
    }
    setFails(fails + 1);
  };



  
  
  const resetAll = () => {
    setResults([]);
    setWins(0);
    setFails(0);
    setProfit(0);
    setComp(0);
    setDecision('');
    setStep1(0);
    setStep2(0);
    setStep3(0);
    setSeed(0);
    setCompPerRoutine(0);
  };



  const exportCSV = () => {
    let csv = "날짜,타입,값,단계\n";
    results.forEach(r => {
      csv += `${r.date},${r.type},${r.value.toUpperCase()}${r.step ? r.step : ''},${r.step || ''}\n`;
    });
    csv += `\n성공,${wins}\n실패,${fails}\n실수익,${profit}\n콤프,${comp}\n총합,${profit + comp}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `baccarat_results_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  
  
const nextPrediction = () => {
  const seq = results.slice(-6).join('');
  if (seq.endsWith('pb') || seq.endsWith('bp')) return { b: 60, p: 35, t: 5 };
  if (seq.endsWith('bbb')) return { b: 45, p: 50, t: 5 };
  return { b: 50, p: 45, t: 5 };
};


const evaluate = (all) => {
    const recent = all.slice(-6);
    const last = recent[recent.length - 1];
    const countB = recent.filter((r) => r === 'b').length;
    const countP = recent.filter((r) => r === 'p').length;
    const bStreak = /(b{3,})/.test(recent.join(''));

    if (last === 't') return setDecision('관망 유지\n이유: 최근 T 발생 후 관망 권장');
    if (recent.length < 6) return setDecision('관망 유지\n이유: 최근 결과 부족');

    const maxStep = step3 > 0 ? 3 : step2 > 0 ? 2 : step1 > 0 ? 1 : 0;

    if (mode === '보수형') {
      if (countB >= 4 && last === 'p')
        return setDecision('관망 유지\n이유: b 과열 후 p 반전 발생');
      if (countP >= 4 && last === 'b')
        return setDecision('관망 유지\n이유: p 과열 후 b 반전 발생');
      if (bStreak && !last.includes('p') && maxStep >= 1)
        return setDecision(`b 1단계 진입 추천
이유: 뱅커 연속 흐름 유지 중`);
      if (/b{5,}/.test(recent.join('')))
        return setDecision('관망 유지\n이유: b 연속 고점 도달');
      return setDecision('관망 유지\n이유: 명확한 흐름 없음');
    }

    if (mode === '공격형') {
      if (bStreak && maxStep >= 2)
        return setDecision('b 2단계 진입 추천\n이유: b 연속 흐름 공격 진입');
      if (countB >= 3 && last === 'p' && maxStep >= 1)
        return setDecision('b 1단계 진입 추천\n이유: 반전 패턴 감지됨');
      return setDecision('관망 유지\n이유: 진입 조건 부족');
    }

    if (mode === '콤프형') {
      if (last === 'b' && maxStep >= 1)
        return setDecision('b 1단계 진입 추천\n이유: b 잔잔 반복 흐름 포착');
      if (countB >= 3 && maxStep >= 2)
        return setDecision('b 2단계 진입 추천\n이유: 콤프 수익용 진입 적기');
      return setDecision('관망 유지\n이유: 패턴 흐름 애매함');
    }
  };


  const total = wins + fails;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  const profitRate = seed > 0 ? ((profit / seed) * 100).toFixed(1) : '0.0';
  const totalRate = seed > 0 ? (((profit + comp) / seed) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", padding: 20, fontFamily: "sans-serif", backgroundColor: "#f4f7fa" }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ color: "#333" }}>🎲 Baccarat Flow AI</h2>

        <div style={{ marginBottom: 10 }}>
          📅 <strong>오늘 날짜:</strong> {today}
          <button onClick={resetAll} style={{ marginLeft: 10 }}>초기화</button>
          <button onClick={exportCSV} style={{ marginLeft: 10 }}>파일 저장</button>
        </div>

        <div>시드 머니: <input value={seed} onChange={(e) => setSeed(Number(e.target.value))} />원</div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          전략 모드:
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="보수형">보수형</option>
            <option value="공격형">공격형</option>
            <option value="콤프형">콤프형</option>
          </select>
          콤프 요율:
          
<button onClick={() => setCompPerRoutine(Math.max((compPerRoutine - 0.1).toFixed(1), 0))}>➖</button>
<span style={{ margin: '0 8px' }}>{compPerRoutine}%</span>
<button onClick={() => setCompPerRoutine((compPerRoutine + 0.1).toFixed(1))}>➕</button>

        </div>

        <div style={{ marginTop: 10 }}>
          <div>1단계 금액: <input value={step1} onChange={e => setStep1(Number(e.target.value))} /></div>
          <div>2단계 금액: <input value={step2} onChange={e => setStep2(Number(e.target.value))} /></div>
          <div>3단계 금액: <input value={step3} onChange={e => setStep3(Number(e.target.value))} /></div>
        </div>

        
<h4 style={{ marginTop: 20 }}>관망 입력</h4>
<div style={{ display: 'flex', gap: '10px' }}>
  <button style={{ backgroundColor: 'lightblue', color: 'white', fontWeight: 'bold' }} onClick={() => handleAddResult('p')}>P</button>
  <button style={{ backgroundColor: 'lightcoral', color: 'white', fontWeight: 'bold' }} onClick={() => handleAddResult('b')}>B</button>
  <button style={{ backgroundColor: 'lightgreen', color: 'white', fontWeight: 'bold' }} onClick={() => handleAddResult('t')}>T</button>
</div>


        <h4 style={{ marginTop: 20 }}>진입 입력</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <button style={{ backgroundColor: 'blue', color: 'white' }} onClick={() => handleEntry('p', 1)}>P - 1단계</button>
            <button style={{ backgroundColor: 'blue', color: 'white' }} onClick={() => handleEntry('p', 2)}>P - 2단계</button>
            <button style={{ backgroundColor: 'blue', color: 'white' }} onClick={() => handleEntry('p', 3)}>P - 3단계</button>
          </div>
          <div>
            <button style={{ backgroundColor: 'red', color: 'white' }} onClick={() => handleEntry('b', 1)}>B - 1단계</button>
            <button style={{ backgroundColor: 'red', color: 'white' }} onClick={() => handleEntry('b', 2)}>B - 2단계</button>
            <button style={{ backgroundColor: 'red', color: 'white' }} onClick={() => handleEntry('b', 3)}>B - 3단계</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: 10 }}>
            <button style={{ backgroundColor: 'green', color: 'white' }} onClick={handleWin}>✅ 이김</button>
            <button style={{ backgroundColor: 'gray', color: 'white' }} onClick={handleFail}>❌ 짐</button>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <strong>최근 결과:</strong> {results.slice(-6).map(renderColored)}
        </div>
        <div>진입 판단: {decision}</div>
      </div>

      <div style={{
        minWidth: 240,
        maxWidth: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
        marginTop: 10,
        padding: 16,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        color: '#222',
        lineHeight: '1.6'
      }}>
        <h3 style={{ color: '#444', marginBottom: 10 }}>📊 수익 & 통계</h3>
        <div>✅ 성공: {wins}회</div>
        <div>❌ 실패: {fails}회</div>
        <div>🏆 승률: {winRate}%</div>
        <div>💰 실수익: {profit.toLocaleString()}원</div>
        <div>🧾 콤프 수익: {comp.toLocaleString()}원</div>
        <div>📈 수익률: {profitRate}%</div>
        <div>📈 총합 수익: {(profit + comp).toLocaleString()}원</div>
        <div>📈 총합 수익률: {totalRate}%</div>
        <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #ddd' }}>
          <h4 style={{ marginBottom: 4, fontSize: '15px', color: '#555' }}>🤖 AI 예측</h4>
          <div>다음 결과 예측:</div>
          <div>B: {nextPrediction().b}%</div>
          <div>P: {nextPrediction().p}%</div>
          <div>T: {nextPrediction().t}%</div>
        </div>
      </div>
    </div>
  );
}


export default App;
