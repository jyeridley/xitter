// bs.xitter.space: the Government feed is the built-in list 2 (lists.ts
// GOV_ID), a home tab and /i/lists/2 (/government). The client's empty list
// says "Posts from people in this List will show up here"; this says what the
// feed is instead, on that page and on the home tab.
export const GOV_FEED_SCRIPT = String.raw`(function(){
	var HEAD="No government posts yet",BODY="Posts from verified government organisations and officials will show up here.";
	function onGov(){
		if(/^\/i\/lists\/2\/?$/.test(location.pathname))return true;
		if(!/^\/home\/?$/.test(location.pathname))return false;
		var t=document.querySelector('[data-testid="primaryColumn"] [role="tab"][aria-selected="true"]');
		return !!t&&(t.textContent||"").trim()==="Government";
	}
	function fix(){
		var box=document.querySelector('[data-testid="primaryColumn"] [data-testid="emptyState"]');
		if(!box||!onGov())return;
		var h=box.querySelector('[data-testid="empty_state_header_text"] span')||box.querySelector('[data-testid="empty_state_header_text"]');
		var b=box.querySelector('[data-testid="empty_state_body_text"] span')||box.querySelector('[data-testid="empty_state_body_text"]');
		if(h&&h.textContent!==HEAD)h.textContent=HEAD;
		if(b&&b.textContent!==BODY)b.textContent=BODY;
	}
	var queued=false;
	function soon(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;fix()})}
	new MutationObserver(soon).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["aria-selected"]});
})();`;
