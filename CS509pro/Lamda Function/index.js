const mysql = require('mysql');
const db_access = require('/opt/nodejs/db_access')

exports.handler = async (event) => {
var pool = mysql.createPool({// credentials from db_access layer (loaded separately via console)
host: db_access.config.host,
user: db_access.config.user,
password: db_access.config.password,
database: db_access.config.database
});

let GetStoresAndInventoryAmount = () => {

return new Promise((resolve, reject) => {
pool.query("SELECT Stores.storeName, Stores.store_id, latitude, longitude, balance, COALESCE(SUM(price), 0) as 'Total_Price' From Stores left join Computers on Stores.store_id = Computers.store_id GROUP BY Stores.storeName ORDER BY Stores.storeName", (error, rows) => {
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

var result;
switch(event.arg1){
	case 'SM_GetStores':
		result = await GetStoresAndInventoryAmount();
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

	case 'Generate_Inventory':
		if(event.store_id)
			result = await generateInventory(event.store_id);
		else
			result = await generateInventory(null);
	break;
}


const response = {
statusCode: 200,
body: JSON.stringify(result)
};
return response;
};




