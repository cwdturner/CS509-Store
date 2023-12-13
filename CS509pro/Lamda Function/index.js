const mysql = require('mysql');
const db_access = require('/opt/nodejs/db_access')

exports.handler = async (event) => {
var pool = mysql.createPool({// credentials from db_access layer (loaded separately via console)
host: db_access.config.host,
user: db_access.config.user,
password: db_access.config.password,
database: db_access.config.database
});

let GetStoresAndInventoryAmount = (sort) => {
	var n;
	if(sort=="ASC")
		n = "SELECT Stores.storeName, Stores.store_id, latitude, longitude, balance, COALESCE(SUM(price), 0) as 'Total_Price' From Stores left join Computers on Stores.store_id = Computers.store_id GROUP BY Stores.storeName ORDER BY Total_Price ASC"
	else if(sort=="DESC")
		n = "SELECT Stores.storeName, Stores.store_id, latitude, longitude, balance, COALESCE(SUM(price), 0) as 'Total_Price' From Stores left join Computers on Stores.store_id = Computers.store_id GROUP BY Stores.storeName ORDER BY Total_Price DESC"
	else
		n = "SELECT Stores.storeName, Stores.store_id, latitude, longitude, balance, COALESCE(SUM(price), 0) as 'Total_Price' From Stores left join Computers on Stores.store_id = Computers.store_id GROUP BY Stores.storeName ORDER BY Stores.storeName"

	return new Promise((resolve, reject) => {
		pool.query(n, (error, rows) => {
			if (error) { return reject(error); }
			if ((rows) && rows.length > 0) {
				return resolve(rows);
			} else {
				return reject("No Results Returned.");
			}
		});
	});
}

let removeStore = (value) => {
return new Promise((resolve, reject) => {
pool.query("DELETE FROM Stores WHERE store_id = ?", [value], (error, rows) => {
if (error) { return reject(error); }
if((rows) && rows.affectedRows > 0){
	return resolve("Store Deleted.");
}
else{
	return resolve("No Stores Deleted.");
}

});
});
}

let createStore = (username_val, password_val, storeName_val, longitude_val, latitude_val) => {
	return new Promise((resolve, reject) => {
	pool.query("SELECT * FROM Logins WHERE username = ?", [username_val], (error, rows) => {
		if (error) { return reject(error); }
		if((rows) && rows.length > 0){
			return resolve("Failure: Username in use.");
		}
		else{
			return resolve(new Promise((resolve, reject) => {
			pool.query("INSERT INTO Stores (storeName, longitude, latitude) VALUES (?,?,?)", [storeName_val, longitude_val, latitude_val], (error, rows) => {
				if (error) { return reject(error); }
				if((rows) && rows.affectedRows > 0){
					var inserted_id = rows.insertId;
					return resolve(new Promise((resolve, reject) => {
					pool.query("INSERT INTO Logins (username, password, store_id) VALUES (?,?,?)", [username_val, password_val, inserted_id], (error, rows) => {
						if (error) { return reject(error); }
						if((rows) && rows.affectedRows > 0){
							var final = {"storeName": storeName_val,"store_id": inserted_id};
							return resolve(final);
						}
					});
					}));
				}
			});
			}));

		}
	});
	});
}

let logInStore = (username_val, password_val) => {
	return new Promise((resolve, reject) => {
	pool.query("SELECT * FROM Logins WHERE username = ? AND password = ? AND site_manager = 0;", [username_val, password_val], (error, rows) => {
		if (error) { return reject(error); }
		if((rows) && rows.length > 0){
			var final = {"status": "Success","store_id": rows[0].store_id};
			return resolve(final);
		}
		else{
			var final = {"status": "Failure","message": "Incorrect Login Information Given."};
			return resolve(final);
		}
	});
	});
}

let logInSitemanager = (username_val, password_val) => {
	return new Promise((resolve, reject) => {
	pool.query("SELECT * FROM Logins WHERE username = ? AND password = ? AND site_manager = 1;", [username_val, password_val], (error, rows) => {
		if (error) { return reject(error); }
		if((rows) && rows.length > 0){
			var final = {"status": "Success","store_id": rows[0].store_id};
			return resolve(final);
		}
		else{
			var final = {"status": "Failure","message": "Incorrect Login Information Given."};
			return resolve(final);
		}
	});
	});
}

let addComputer = (computerName_val, store_id_val, storeName_val, price_val, processor_val, generation_val, memory_val, storage_val, graphicsCard_val) => {
	var stName = "";
	return new Promise((resolve, reject) => {
		pool.query("SELECT storeName FROM Stores WHERE store_id = ?", [store_id_val], (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.length > 0){
				stName = rows[0].storeName;
				return resolve(new Promise((resolve, reject) => {
					pool.query("INSERT INTO Computers (computerName, store_id, storeName, price, processor, generation, memory, storage, graphicsCard) VALUES (?,?,?,?,?,?,?,?,?);", [computerName_val, store_id_val, stName, price_val, processor_val, generation_val, memory_val, storage_val, graphicsCard_val], (error, rows) => {
					//pool.query("INSERT INTO Computers (computerName, store_id, storeName, price, processor, generation, memory, storage, graphicsCard) VALUES ('A PC', 4, 'Cool Comps', '1200.00', 'Intel i7', '12th Gen Intel', '8G', '800G', 'NVIDIA GeForce ');" , (error, rows) => {
					if (error) { return reject(error); }
					if((rows) && rows.affectedRows > 0){
						return resolve("Success: Computer Added.");
					}
					else{
						return reject("Computer Not Added");
					}
					});
				}));
			}
			else{
				return reject("No rows returned.");
			}
		});
		});

}

let removeComputer = (computer_id) => {
	return new Promise((resolve, reject) => {
		pool.query("DELETE FROM Computers WHERE computer_id = ?", [computer_id], (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.affectedRows > 0){
				return resolve(new Promise((resolve, reject) => {
					pool.query("Update SiteManager set sm_balance = sm_balance + 25.00 where sm_id=1;", (error, rows) => {
					if (error) { return reject(error); }
					if((rows) && rows.affectedRows > 0){
						return resolve("Success: Computer Removed");
					}
					else{
						return reject("Computer Not Added");
					}
					});
				}));
			}
			else{
				return resolve("No Computer Deleted.");
			}
		});
	});
}

let editCompPrice = (new_price, computer_id_list) => {
	return new Promise((resolve, reject) => {
		pool.query("UPDATE Computers SET price = ? WHERE computer_id IN (?)", [new_price, computer_id_list], (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.affectedRows > 0){
				return resolve("Prices Updated.");
			}
			else{
				return reject("No Prices Updated");
			}
		});
	});
}

let generateInventory = (store_id_val) => {
	if(store_id_val){
		return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM Computers WHERE store_id = ? ORDER BY store_id", [store_id_val], (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.length > 0){
				return resolve(rows);
			}
			else{
				return reject("No rows returned.");
			}
		});
		});
	}
	{
		return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM Computers ORDER BY store_id",  (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.length > 0){
				return resolve(rows);
			}
			else{
				return reject("No rows returned.");
			}	
		});
		});
	}
}

let Report_SiteManager_Inventory = () => {
	return new Promise((resolve, reject) => {
		pool.query("SELECT Stores.storeName, Stores.store_id, latitude, longitude, balance, COALESCE(SUM(price), 0) as 'Total_Price' From Stores left join Computers on Stores.store_id = Computers.store_id  GROUP BY Stores.storeName ORDER BY Stores.storeName", (error, rows) => {
			if (error) {
				return reject(error);
			}
			if (rows && rows.length > 0) {
				return resolve(rows);
			} else {
				return reject("No Results Returned. ");
			}
		    
	    });
        });
    }

let SM_GetBalance = () => {

return new Promise((resolve, reject) => {
pool.query("SELECT storeName, balance FROM Stores ORDER BY storeName", (error, rows) => {
if (error) { return reject(error); }
if ((rows) && rows.length > 0) {
	return resolve(rows);
} else {
	return reject("No Results Returned.");
}
});
});
}

let SM_Balance = () => {

return new Promise((resolve, reject) => {
pool.query("SELECT sm_balance FROM SiteManager WHERE sm_id = 1", (error, rows) => {
if (error) { return reject(error); }
if ((rows) && rows.length > 0) {
	return resolve(rows);
} else {
	return reject("No Results Returned.");
}
});
});
}

let SO_GetBalance = (storeID) => {

	return new Promise((resolve, reject) => {
		pool.query("SELECT balance FROM Stores WHERE store_id = ?", [storeID], (error, rows) => {
			if (error) { return reject(error); }
			if ((rows) && rows.length > 0) {
				return resolve(rows);
			} else {
				return reject("0");
			}
		});
	});
}

//Found at https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
let calculateShipping = (storeLat, storeLong, buyerLat, buyerLong) => {
	var radius = 6371;
	var dLat = (buyerLat - storeLat) * (Math.PI/180);
	var dLong = (buyerLong - storeLong) * (Math.PI/180);

	var a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
		Math.cos((storeLat) * (Math.PI/180)) * Math.cos((buyerLat) * (Math.PI/180)) * 
		Math.sin(dLong/2) * Math.sin(dLong/2);

	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	var d = radius * c;
	var shipping = d * 0.621371; //Distance in miles
	return shipping;
}
    
let buy_computer = (comp_id, buyer_lat, buyer_long) => {
	return new Promise((resolve, reject) => {
		pool.query("Select Computers.computerName, Computers.price, Computers.store_id, Stores.latitude, Stores.longitude From Computers Inner Join Stores ON Computers.store_id = Stores.store_id Where Computers.computer_id = ?;", [comp_id], (error, rows) => {//Check computer is available.
			if (error){
				return reject(error);
			}
			if(rows && rows.length > 0){
				var storeID = rows[0].store_id;//Get store ID
				var compName = rows[0].computerName;
				var compPrice = rows[0].price;
				var storeLat = rows[0].latitude;
				var storeLong = rows[0].longitude;
				var shipping = calculateShipping(storeLat, storeLong, buyer_lat, buyer_long);
				shipping = Math.round(shipping*100)/100;
				var total = shipping + compPrice;
				var storeCut = total * 0.95;
				var siteCut = total *0.05;
				return resolve(new Promise((resolve, reject) => {
					pool.query("DELETE FROM Computers WHERE computer_id = ?", [comp_id], (error, rows) => {
						if (error){
							return reject(error);
						}
						if(rows && rows.affectedRows > 0){//Computer Removed
								return resolve(new Promise((resolve,reject) => {
								pool.query("UPDATE Stores SET balance = balance + ? WHERE store_id = ?", [storeCut, storeID], (error, rows) => {
								if(error){
									return reject(error);
								}
								if(rows && rows.affectedRows > 0){//Store balance Updated
									return resolve(new Promise((resolve,reject) => {
										pool.query("UPDATE SiteManager SET sm_balance = sm_balance + ? WHERE sm_id = 1", [siteCut], (error, rows) => {
										if(error){
											return reject(error);
										}
										if(rows && rows.affectedRows > 0){//SiteManager balance Updated
											return resolve({"computerName": compName, "price": compPrice, "shipping": shipping, "totalPrice": total});
										}
										else{
											return reject("");
										}
										});
									}));
								}
								else{
									return reject("");
								}
								});
							}));
						}
						else{
							return reject("Computer no longer available.");
						}
					});
				}));
			}
			else {
				return reject("Computer no longer available.")
			}
		});
	});
}    

//gen a list of stores for the cust
let store_list = () => {
	return new Promise((resolve, reject) => {
		pool.query("SELECT storeName FROM Stores ORDER BY storeName", (error, rows) => {
			if (error) {
				return reject(error);
			}
			if (rows && rows.length > 0) {
				return resolve(rows);
			} else {
				return reject("No Results Returned. ");
			}
		    
	    });
        });
    }
    
    
    
    
    
//gen inv based on store for cust
let custGenInv = (store_name,pri,ram,sto,gpu,cpu,gen) => {
	if(store_name){
		console.log("ram"+ram);
		if (store_name=="storeName"){
			var storeSql ="??";	
		}
		else var storeSql ="?";
		//--------------------------------
		if (ram=="memory"){
			var ramSql ="(memory = memory)";
			
		}
		else if(ram=="32+"){
			var ramSql ="(memory = \"32GB\")";
			
		}
			else if(ram=="16GB"){
			var ramSql ="(memory = \"16GB\")";
		}
			else if(ram=="8GB"){
			var ramSql ="(memory = \"8GB\")";
		}
			else if(ram=="4GB"){
			var ramSql ="(memory = \"4GB\" or memory = \"1GB\")";
		}
		
		
		//---------------------------------
		if(pri=="price"){
			var be1 = -1;
			var be2 = 999999999;
		}
		else if(pri=="2000+"){
			var be1 = 2001;
			var be2 = 999999999;
		}
		else if(pri=="1501-2000"){
			var be1 = 1501;
			var be2 = 2000;
		}
		else if(pri=="1001-1500"){
			var be1 = 1001;
			var be2 = 1500;
		}
		else if(pri=="501-1000"){
			var be1 = 501;
			var be2 = 1000;
		}
		else {
			var be1 = -1;
			var be2 = 500;
		}
		//------------------------------------
		
		
		if (sto=="storage"){
			var storageSql ="??";	
		}
		else var storageSql ="?";
		//-------------------------------------------
		
		if (gpu=="graphicsCard"){
			
			var gpuSql ="(graphicsCard = graphicsCard)";
		}
		
		else if 	(gpu=="NVIDIA"){
			var gpuSql ="(graphicsCard = \"NVIDIA GeForce RTX 4090\" or graphicsCard = \"NVIDIA GeForce RTX 4080\")";	
		}
		else if 	(gpu=="AMD"){
			var gpuSql ="(graphicsCard = \"AMD Radeon Pro W6300\" or graphicsCard = \"AMD Radeon Pro W6400\")";	
		}
			else if 	(gpu=="INTEL"){
			var gpuSql ="(graphicsCard = \"Intel Integrated Graphics\" or graphicsCard = \"Intel UHD Graphics 730\" or graphicsCard = \"Intel UHD Graphics 770\")";	
		}
		else if (gpu=="NVIDIA GeForce RTX 4090"){
			
			var gpuSql ="(graphicsCard = \"NVIDIA GeForce RTX 4090\")";
		}
		else if (gpu=="NVIDIA GeForce RTX 4080"){
			
			var gpuSql ="(graphicsCard = \"NVIDIA GeForce RTX 4080\")";
		}
		else if (gpu=="AMD Radeon Pro W6300"){
			
			var gpuSql ="(graphicsCard = \"AMD Radeon Pro W6300\")";
		}
		else if (gpu=="AMD Radeon Pro W6400"){
			
			var gpuSql ="(graphicsCard = \"AMD Radeon Pro W6400\")";
		}
		else if (gpu=="Intel Integrated Graphics"){
			
			var gpuSql ="(graphicsCard = \"Intel Integrated Graphics\")";
		}
		else if (gpu=="Intel UHD Graphics 730"){
			
			var gpuSql ="(graphicsCard = \"Intel UHD Graphics 730\")";
		}
		else if (gpu=="Intel UHD Graphics 770"){
			
			var gpuSql ="(graphicsCard = \"Intel UHD Graphics 770\")";
		}
		else var gpuSql ="(graphicsCard = graphicsCard)";
		//-------------------------------------------------------------------------------------
		if(cpu=="processor"){
			var cpuSql="processor = processor";
		}
		else if(cpu=="AMD"){
			var cpuSql="(processor = \"AMD Ryzen 9\" or processor = \"AMD Ryzen 7\")";
		}
		else if(cpu=="Intel"){
			var cpuSql="(processor = \"Intel Xeon\" or processor = \"Intel i9\" or processor = \"Intel i7\")";
		}
		//---------------------------------------------------------------------
		if(gen=="generation"){
			var genSql="generation = generation";
		}
		else if(gen=="generation"){
			var genSql="generation = generation";
		}
		else{
			var genSql="generation = \""+gen+"\"";
		}
		
		
		//var test = "="
		return new Promise((resolve, reject) => {
		//pool.query("SELECT * FROM Computers WHERE memory = "+ramSql+" ORDER BY memory", [ram], (error, rows) => {              AND graphicsCard = "+gpuSql+"
		
		//pool.query("SELECT * FROM Computers WHERE storeName = "+storeSql+" AND memory = "+ramSql+" AND price between ? AND ? AND storage = "+storageSql+" AND graphicsCard = "+gpuSql+" ORDER BY storeName", [store_name,ram,be1,be2,sto,gpu], (error, rows) => {
		pool.query("SELECT * FROM Computers WHERE (storeName = "+storeSql+" AND "+ramSql+" AND price between ? AND ? AND storage = "+storageSql+") AND "+gpuSql+" AND "+cpuSql+" AND "+genSql+" ORDER BY storeName", [store_name,be1,be2,sto], (error, rows) => {
	
			if (error) { return reject(error); }
			if((rows) && rows.length > 0){
				return resolve(rows);
			}
			else{
				return reject("No rows returned.");
			}
		});
		});
	}
	{
		
		return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM Computers ORDER BY storeName",  (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.length > 0){
				return resolve(rows);
			}
			else{
				return reject("No rows returned.");
			}	
		});
	});	
	}
}



var result;
switch(event.arg1){
	case 'SM_GetStores':
		result = await GetStoresAndInventoryAmount(event.sort);
	break;

	case 'SM_RemoveStore':
		result = await removeStore(event.store_id);
	break;

	case 'SO_CreateStore':
		result = await createStore(event.username, event.password, event.storeName, parseFloat(event.longitude), parseFloat(event.latitude));
	break;

	case 'SO_AddComputer':
		result = await addComputer(event.computerName, parseInt(event.store_id), event.storeName, parseFloat(event.price), event.processor, event.generation, event.memory, event.storage, event.graphicsCard);
	break;

	case 'SO_RemoveComputer':
		result = await removeComputer(event.computer_id);
	break;

	case 'Generate_Inventory':
		if(event.store_id)
			result = await generateInventory(event.store_id);
		else
			result = await generateInventory(null);
	break;
	case 'Report_SiteManager_Inventory':
		result = await reportSiteManagerInventory();
	break;
	case 'SM_GetBalance':
		result = await SM_GetBalance();
	break;
	case 'SM_Balance':
		result = await SM_Balance();
	break;
	
	case 'store_list':
		result = await store_list();
	break;
	
	case 'SO_Login':
		result = await logInStore(event.username, event.password);
	break;
	
	case 'SM_Login':
		result = await logInSitemanager(event.username, event.password);
	break;
	
	case 'SO_EditPrice':
		result = await editCompPrice(event.newPrice, event.compIDs);
	break;
	
	case 'BuyComputer':
		result = await buy_computer(event.comp_id, event.buyerLat, event.buyerLong);
	break;
	
	case 'SO_GetBalance':
		result = await SO_GetBalance(event.storeID);
	break;
	
	case 'custGenInv':
		if(event.store_name)
			result = await custGenInv(event.store_name,event.price,event.memory,event.storage,event.graphicsCard,event.processor,event.generation);
		else
			result = await custGenInv(null);
	break;
		
}


const response = {
statusCode: 200,
body: JSON.stringify(result)
};
return response;
};





