// core.js | ToDo List core
// language : English (en_US)
// company : aLabs di Mattia Accornero (http://www.alabs.it)
// author : Mattia Accornero (https://github.com/beat84)

var todo = {
	debug : false,
	lang : "en",
	available_lang : ["en", "it", "es", "de"]
}

todo.isDad = function(child){
	child.parent = this;
	return true;
}

todo.init = function(id, element){
	this.who = id;
	this.element = element;
	this.isDad(this.db);
	if(id!="detail"){
		this.db.start();
	}
	for(var i=0; i<this.available_lang.length; i++){
		if(this.available_lang[i]==blackberry.system.language.substr(0, 2)){
			this.lang = blackberry.system.language.substr(0,2);
			break;
		}
	}
	/*if(this.who=="complete"){
		this.element.getElementById("title").setAttribute("data-bb-action-caption", this.get_dict("clean"));
	}*/
	return true;
}

todo.get_dict = function(word){
	return eval("languages."+this.lang+"."+word);
}

todo.set_language = function(){
	var elems = ["title", "btn_uncomplete", "btn_complete", "btn_add_task", "btn_do_complete", "btn_do_delete"];
	for(var i=0; i<elems.length; i++) {
		var obj = document.getElementById(elems[i]);
		if(obj!=null){
			var txt = this.get_dict(obj.getAttribute("data-lang"));
			obj.setCaption(txt);
		}
	}
	
	var elem = document.getElementById("subtitle");
	if(elem!=null){
		elem.innerText = this.get_dict(elem.getAttribute("data-lang"));
	}
	var elem = document.getElementById("caption");
	if(elem!=null){
		elem.setAttribute("placeholder", this.get_dict(elem.getAttribute("data-lang")));
	}
	var elem = document.getElementById("btn_back");
	if(elem!=null){
		elem.setBackCaption(this.get_dict(elem.getAttribute("data-lang")));
	}

	return true;
}

todo.list = function(type){
	if(type=="complete"){
		bb.pushScreen('complete.htm', 'complete');
	}else if(type=="uncomplete"){
		bb.pushScreen('uncomplete.htm', 'uncomplete');
	}
	return true;
}

todo.managing = function(id){
	this.working_task = id;
	bb.pushScreen('detail.htm', 'detail');
	this.set_language();
	return true;
}

todo.add = function(value){
	if(typeof(value)=="undefined" || value==""){
		return false;
	}
	this.db.isFirstLaunch = false;
	this.db.insert_data(value);
	
	return true;
}

todo.complete = function(){
	this.db.open();
	this.db.update_data(this.working_task);
	bb.pushScreen('complete.htm', 'complete');
	return true;
}

todo.remove = function(){
	this.db.open();
	this.db.remove_data(this.working_task);
	bb.pushScreen('uncomplete.htm', 'uncomplete');
	return true;
}

todo.clean = function(){	
	try {
		blackberry.ui.dialog.standardAskAsync(todo.get_dict("cleaning_popup_text"), blackberry.ui.dialog.D_DELETE, todo.clean_cb, {title : todo.get_dict("cleaning_popup_title")});
	}catch (e) {
		alert("Exception in standardDialog: " + e);
	}
	return true;
}

todo.clean_cb = function(selection){
	// onactionclick="todo.clean();"
	if(selection==0){
		todo.db.remove_completed();
		bb.pushScreen('uncomplete.htm', 'uncomplete');
	}
	return true;
}

todo.db = {
	lives: 2,
	isFirstLaunch: false
}

todo.db.start = function(){
	try {
		this.open();

		if(!this.link){
			blackberry.app.exit();
		}

		var database = this.link;
		var _self = this;
		
		database.transaction(function(tx) {
			_self.parent.create_list(tx);
		}, function(error){
			todo.db.init(database);
		});

	} catch(ex) {
		if(ex == 2){
			// Version number mismatch.
			console.log("Invalid database version.");
		}else{
			console.log("Unknown error "+ex+".");
		}
		//blackberry.app.exit();
	}
}

todo.db.init = function(database){
	this.isFirstLaunch = true;
	var _self = this;
	database.transaction(_self.create, function(e){
		if(--this.lives > 0){
			_self.init(database);
		}else{
			blackberry.app.exit();
		}
	});
	return true;
}


todo.db.create = function(tx){
	tx.executeSql("CREATE TABLE tbl_list(id INTEGER PRIMARY KEY ASC, add_date DATETIME, task TEXT, status INTEGER)", null, null);
	this.isFirstLaunch = false;
	return true;
}

todo.db.open = function(){
	if(this.link){
		return true;
	}
	
	if (!window.openDatabase) {
		return false;
	}

	try{
		this.link = openDatabase("todo_list", "1.0", "ToDo List DB", 10*1024*1024);
		return true;
	}
	catch(e){
		return false;
	}
}

todo.db.insert_data = function(task){
	var database = this.link;
	var _self = this;
	database.transaction(function(tx){
		var date = new Date();
		date = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate();
		tx.executeSql("INSERT INTO tbl_list (add_date, task, status) VALUES (\""+date+"\", \""+task+"\", "+0+")");
		_self.parent.list("uncomplete");
	}, function(e){
		//console.log("Issue with insert into DB - ");
		//console.log(e);
	});
}

todo.db.update_data = function(id){
	var database = this.link;
	database.transaction(function(tx) {
		tx.executeSql("UPDATE tbl_list SET status = 1 WHERE id = ?", [id]);
	}, function(e){
		//console.log("Issue with update data into DB - "+e);
	});
}

todo.db.remove_data = function(id){
	var database = this.link;
	database.transaction(function(tx){
		tx.executeSql("DELETE FROM tbl_list WHERE id=?", [id]);
	}, function(e){
		//console.log("Issue with removing data from DB - "+e);
	});
}

todo.db.remove_completed = function(){
	var database = this.link;
	database.transaction(function(tx){
		tx.executeSql("DELETE FROM tbl_list WHERE status=1");
	}, function(e){
		//console.log("Issue with removing data from DB - "+e);
	});
}

todo.db.load_data = function(tx, who){
	var _self = this;
	tx.executeSql("SELECT * FROM tbl_list WHERE status="+who, null, function(tx, rs){
		_self.parent.append_data(tx, rs);
	}, function(e){
		//console.log("No possible to get data from DB - Init DB");
		//console.log(e);
		_self.init();
	});
	return true;
}

todo.convert_status = function(who){
	if(who=="complete"){
		return 1;
	}else if(who=="uncomplete"){
		return 0;
	}
	return false;
}

todo.create_list = function(tx){
	try{
		this.db.load_data(tx, this.convert_status(this.who));
	}
	catch(e){
		return false;
	}
}

todo.append_data = function(tx, rs){
	var rows = rs.rows;
	var el = this.element;
	if(rows.length==0 && this.convert_status(this.who)==1){
		var item = document.createElement('div');
		item.setAttribute("id", "no_task_message");
		item.setAttribute("data-bb-type", "round-panel");
		item.setAttribute("style", "margin-top:10px;");
		
		var item2 = document.createElement('p');
		item2.setAttribute("style", "text-align:center;");
		item2.innerHTML = 'No completed tasks yet!';
		
		el.getElementById(this.who).appendItem(item2);

		return false;
	}
	for(var i=0; i < rows.length; i++){
		var row = rows.item(i);
		var item = document.createElement('div');
		item.setAttribute("data-bb-type", "item");
		item.setAttribute("data-id", row.id);
		item.setAttribute("data-bb-title", row.task);
		if(todo.convert_status(this.who)==0){
			item.setAttribute("onclick", "todo.managing('"+row.id+"');")
		}
		item.setAttribute("data-bb-img", this.who+".png");
		el.getElementById(this.who).appendItem(item);
/*		tb = el.getElementById("title");
		tb.setAttribute("data-bb-action-caption", this.get_dict("clean"));*/
		
	}
	
}