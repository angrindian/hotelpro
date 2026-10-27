import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, AppBar, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Container,  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl, Grid, IconButton, InputLabel, MenuItem, Select, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Toolbar, Typography } from '@mui/material';
import { Dashboard, Hotel, MeetingRoom, EventAvailable, Payments, Logout, Add, Refresh, CleaningServices, Analytics } from '@mui/icons-material';
import axios from 'axios';

type User = { id: string; name: string; email: string; role: string; hotelIds: string[] };
type HotelRecord = { _id: string; name: string; city: string; currency?: string ;  description?: string;};
type RoomRecord = { _id: string; roomNumber: string; type: string; capacity: number; pricePerNight: number; status: string; hotelId: string | { _id: string } };
type BookingRecord = { _id: string; bookingCode: string; checkIn: string; checkOut: string; totalAmount: number; status: string; paymentStatus: string; hotelId: HotelRecord | string; roomId: { roomNumber: string; type: string } | string; guestId: { name: string; email: string } | string };
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api', withCredentials: true });
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [mode,setMode] = useState<'login'|'register'>('login'); const [name,setName] = useState(''); const [email,setEmail] = useState('admin@hotelpro.local'); const [password,setPassword] = useState('ChangeMe123!'); const [error,setError] = useState(''); const [busy,setBusy] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); setBusy(true); try { const {data} = await api.post(`/auth/${mode}`, mode === 'register' ? {name,email,password} : {email,password}); onLogin(data.user); } catch (e: any) { setError(e?.response?.data?.error || 'Could not connect to HotelPro API. Check that the backend is running.'); } finally { setBusy(false); } }
  return <Box sx={{ minHeight:'100vh', display:'grid', placeItems:'center', p:2, background:'linear-gradient(135deg,#edf3f9,#f8f7f4)' }}><Card sx={{ width:'100%', maxWidth:440, borderRadius:4 }}><CardContent sx={{ p:4 }}><Stack spacing={2.5}><Stack direction="row" spacing={1.5} alignItems="center"><Avatar sx={{ bgcolor:'#163a5f', width:48,height:48 }}><Hotel/></Avatar><Box><Typography variant="h4" fontWeight={800}>HotelPro</Typography><Typography color="text.secondary">Hotel operations, all in one place</Typography></Box></Stack><Typography variant="h6">{mode==='login'?'Sign in to your workspace':'Create a guest account'}</Typography>{error && <Alert severity="error">{error}</Alert>}<Box component="form" onSubmit={submit}><Stack spacing={2}>{mode==='register' && <TextField label="Full name" value={name} onChange={e=>setName(e.target.value)} required/>}<TextField label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><TextField label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required helperText={mode==='register'?'Use at least 10 characters':'Demo admin password is prefilled for local setup'}/><Button type="submit" variant="contained" size="large" disabled={busy}>{busy?<CircularProgress size={22} color="inherit"/>:mode==='login'?'Sign in':'Create account'}</Button><Button onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?'New guest? Create an account':'Already registered? Sign in'}</Button></Stack></Box><Alert severity="info">Demo access is for local development only. Change or remove the seeded credentials before deployment.</Alert></Stack></CardContent></Card></Box>;
}

export default function App() {
 const [user,setUser] = useState<User|null>(null); const [loading,setLoading] = useState(true); const [hotels,setHotels] = useState<HotelRecord[]>([]); const [hotelId,setHotelId] = useState(''); const [rooms,setRooms] = useState<RoomRecord[]>([]); const [bookings,setBookings] = useState<BookingRecord[]>([]); const [summary,setSummary] = useState<any>(null); const [page, setPage] = useState<string>('Overview'); const [error,setError] = useState(''); const [toast,setToast] = useState(''); const [bookingOpen,setBookingOpen] = useState(false); const [roomOpen,setRoomOpen] = useState(false); const [form,setForm] = useState({roomId:'',checkIn:'',checkOut:'',guests:1}); const [roomForm,setRoomForm] = useState({roomNumber:'',type:'Standard',capacity:2,pricePerNight:2500,description:''}); const [busy,setBusy] = useState(false);
 const canManage = ['admin','manager','staff','receptionist'].includes(user?.role || ''); const canAnalyze = ['admin','manager'].includes(user?.role || '');
 async function refresh() { if (!user) return; setError(''); try { const [h,b] = await Promise.all([api.get('/hotels'),api.get('/bookings')]); setHotels(h.data.hotels); setBookings(b.data.bookings); const selected = hotelId || h.data.hotels[0]?._id || ''; setHotelId(selected); if (selected) { const r=await api.get(`/hotels/${selected}/rooms`); setRooms(r.data.rooms); } if (canAnalyze) { const a=await api.get('/analytics/summary'); setSummary(a.data); } } catch(e:any) { setError(e?.response?.data?.error || 'Unable to load data'); } }
 useEffect(()=>{ api.get('/auth/me').then(r=>setUser(r.data.user)).catch(()=>{}).finally(()=>setLoading(false)); },[]);
 useEffect(()=>{ if(user) refresh(); },[user]);
 useEffect(()=>{ if(user && hotelId) api.get(`/hotels/${hotelId}/rooms`).then(r=>setRooms(r.data.rooms)).catch(()=>{}); },[hotelId]);
 async function logout() { try { await api.post('/auth/logout'); } finally { setUser(null); setHotels([]); setRooms([]); setBookings([]); } }
 async function makeBooking(e:FormEvent) { e.preventDefault(); setBusy(true); try { const {data}=await api.post('/bookings',{hotelId,roomId:form.roomId,checkIn:form.checkIn,checkOut:form.checkOut,guests:Number(form.guests)}); const payment=await api.post(`/bookings/${data.booking._id}/mock-payment`,{outcome:'success'}); setToast(`Booking ${payment.data.booking.bookingCode} confirmed (mock payment).`); setBookingOpen(false); await refresh(); } catch(e:any) { setError(e?.response?.data?.error || 'Booking failed'); } finally { setBusy(false); } }
 async function addRoom(e:FormEvent) { e.preventDefault(); setBusy(true); try { await api.post('/rooms',{...roomForm,hotelId,capacity:Number(roomForm.capacity),pricePerNight:Number(roomForm.pricePerNight)}); setRoomOpen(false); setToast('Room added'); await refresh(); } catch(e:any) { setError(e?.response?.data?.error || 'Could not add room'); } finally { setBusy(false); } }
 async function changeStatus(id:string,status:string) { try { await api.patch(`/bookings/${id}/status`,{status}); setToast(`Booking updated to ${status.replace('_',' ')}`); await refresh(); } catch(e:any) { setError(e?.response?.data?.error || 'Could not update booking'); } }
 const nav = [{name:'Overview',icon:<Dashboard/>},{name:'Properties',icon:<Hotel/>},{name:'Rooms',icon:<MeetingRoom/>},{name:'Reservations',icon:<EventAvailable/>},{name:'Housekeeping',icon:<CleaningServices/>},...(canAnalyze?[{name:'Analytics',icon:<Analytics/>}]:[])];
 const visibleBookings = useMemo(()=>bookings, [bookings]);
 if(loading) return <Box sx={{height:'100vh',display:'grid',placeItems:'center'}}><CircularProgress/></Box>;
 if(!user) return <Login onLogin={setUser}/>;
 return <Box sx={{display:'flex',minHeight:'100vh'}}><AppBar position="fixed" elevation={0} color="inherit" sx={{borderBottom:'1px solid #e5eaf0',zIndex:1201}}><Toolbar><Stack direction="row" alignItems="center" spacing={1.5} sx={{flexGrow:1}}><Avatar sx={{bgcolor:'primary.main'}}><Hotel/></Avatar><Box><Typography fontWeight={800} lineHeight={1.2}>HotelPro</Typography><Typography variant="caption" color="text.secondary">Hospitality management</Typography></Box></Stack><Chip label={user.role.toUpperCase()} size="small" sx={{mr:2}}/><Typography variant="body2" sx={{mr:2,display:{xs:'none',sm:'block'}}}>{user.name}</Typography><IconButton onClick={logout} aria-label="Sign out"><Logout/></IconButton></Toolbar></AppBar><Drawer variant="permanent" sx={{width:240,flexShrink:0,'& .MuiDrawer-paper':{width:240,boxSizing:'border-box',pt:10,px:1.5,borderRight:'1px solid #e5eaf0',background:'#fbfcfe'}}}><Typography variant="overline" color="text.secondary" sx={{px:2,mb:1}}>WORKSPACE</Typography>{nav.map(n=><Button key={n.name} startIcon={n.icon} onClick={()=>setPage(n.name)} fullWidth sx={{justifyContent:'flex-start',px:2,py:1.25,mb:.5,bgcolor:page===n.name?'#e9f0f7':'transparent',color:page===n.name?'primary.main':'text.secondary',fontWeight:page===n.name?700:500}}>{n.name}</Button>)}<Box sx={{mt:'auto',p:2}}><Divider/><Typography variant="caption" color="text.secondary" display="block" sx={{mt:2}}>HotelPro portfolio build</Typography><Typography variant="caption" color="text.secondary">Mock payments enabled</Typography></Box></Drawer><Box component="main" sx={{flexGrow:1,ml:'240px',pt:11,pb:5,px:{xs:2,md:4},minWidth:0}}><Container maxWidth="xl" disableGutters><Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" alignItems={{xs:'stretch',sm:'center'}} gap={2} sx={{mb:3}}><Box><Typography variant="overline" color="secondary.main" fontWeight={800}>HOTEL OPERATIONS</Typography><Typography variant="h4" fontWeight={800}>{page}</Typography><Typography color="text.secondary">Manage properties, rooms and guest reservations.</Typography></Box><Stack direction="row" gap={1}><FormControl size="small" sx={{minWidth:190}}><InputLabel>Property</InputLabel><Select<string> label="Property" value={hotelId} onChange={e=>setHotelId(e.target.value)}>{hotels.map(h=><MenuItem key={h._id} value={h._id}>{h.name} · {h.city}</MenuItem>)}</Select></FormControl><Button variant="outlined" startIcon={<Refresh/>} onClick={refresh}>Refresh</Button></Stack></Stack>
 {error && <Alert severity="error" sx={{mb:2}} onClose={()=>setError('')}>{error}</Alert>}
 {page==='Overview' && <><Grid container spacing={2} sx={{mb:3}}>{[{label:'Properties',value:hotels.length,icon:<Hotel/>,hint:'Active hotels'},{label:'Rooms',value:rooms.length,icon:<MeetingRoom/>,hint:'Selected property'},{label:'Reservations',value:bookings.length,icon:<EventAvailable/>,hint:'Visible to your role'},{label:'Paid revenue',value:summary?money(summary.revenue):'—',icon:<Payments/>,hint:'Confirmed mock payments'}].map(k=><Grid item xs={12} sm={6} lg={3} key={k.label}><Card variant="outlined" sx={{borderRadius:3}}><CardContent><Stack direction="row" justifyContent="space-between"><Box><Typography color="text.secondary" variant="body2">{k.label}</Typography><Typography variant="h4" fontWeight={800} sx={{my:1}}>{k.value}</Typography><Typography variant="caption" color="text.secondary">{k.hint}</Typography></Box><Avatar sx={{bgcolor:'#eaf0f7',color:'primary.main'}}>{k.icon}</Avatar></Stack></CardContent></Card></Grid>)}</Grid><Grid container spacing={2}><Grid item xs={12} md={7}><Card variant="outlined" sx={{borderRadius:3,height:'100%'}}><CardContent><Typography variant="h6" fontWeight={750}>Recent reservations</Typography><BookingTable bookings={visibleBookings.slice(0,5)} onStatus={changeStatus} canManage={canManage}/></CardContent></Card></Grid><Grid item xs={12} md={5}><Card variant="outlined" sx={{borderRadius:3,height:'100%'}}><CardContent><Typography variant="h6" fontWeight={750}>Room status</Typography><Stack spacing={1.5} sx={{mt:2}}>{['available','occupied','cleaning','maintenance'].map(s=><Stack direction="row" alignItems="center" justifyContent="space-between" key={s}><Typography sx={{textTransform:'capitalize'}}>{s}</Typography><Chip label={rooms.filter(r=>r.status===s).length} size="small" color={s==='available'?'success':s==='maintenance'?'error':'default'}/></Stack>)}</Stack><Button sx={{mt:2}} onClick={()=>setPage('Rooms')}>View inventory</Button></CardContent></Card></Grid></Grid></>}
 {page==='Properties' && <Card variant="outlined" sx={{borderRadius:3}}><CardContent><Typography variant="h6" fontWeight={750} sx={{mb:2}}>Properties</Typography><Grid container spacing={2}>{hotels.map(h=><Grid item xs={12} md={6} lg={4} key={h._id}><Card variant="outlined"><CardContent><Avatar sx={{bgcolor:'#eaf0f7',color:'primary.main',mb:2}}><Hotel/></Avatar><Typography variant="h6">{h.name}</Typography><Typography color="text.secondary">{h.city}</Typography><Button
  sx={{ mt: 2 }}
  onClick={() => {
    setHotelId(h._id);
    setPage('Property Details');
  }}
>
  View property
</Button></CardContent></Card></Grid>)}</Grid></CardContent></Card>}
 {page==='Rooms' && <Card variant="outlined" sx={{borderRadius:3}}><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb:2}}><Typography variant="h6" fontWeight={750}>Room inventory</Typography>{canManage&&<Button variant="contained" startIcon={<Add/>} onClick={()=>setRoomOpen(true)}>Add room</Button>}</Stack><Table size="small"><TableHead><TableRow><TableCell>Room</TableCell><TableCell>Type</TableCell><TableCell>Capacity</TableCell><TableCell>Nightly rate</TableCell><TableCell>Status</TableCell></TableRow></TableHead><TableBody>{rooms.map(r=><TableRow key={r._id}><TableCell>{r.roomNumber}</TableCell><TableCell>{r.type}</TableCell><TableCell>{r.capacity}</TableCell><TableCell>{money(r.pricePerNight)}</TableCell><TableCell><Chip size="small" label={r.status} color={r.status==='available'?'success':r.status==='maintenance'?'error':'default'}/></TableCell></TableRow>)}</TableBody></Table>{!rooms.length&&<Typography color="text.secondary" sx={{py:3}}>No rooms found for this property.</Typography>}</CardContent></Card>}
{page === 'Property Details' && (() => {
  const hotel = hotels.find(h => h._id === hotelId);
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(
    r => r.status === 'available'
  ).length;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Button
          onClick={() => setPage('Properties')}
          sx={{ mb: 2 }}
        >
          ← Back to Properties
        </Button>

        <Typography variant="h5" fontWeight={750}>
          {hotel?.name ?? 'Property Details'}
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {hotel?.city ?? 'Location unavailable'}
        </Typography>

        <Typography sx={{ mt: 2 }}>
          {hotel?.description || 'No property description has been added yet.'}
        </Typography>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary">
                  Total Rooms
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {totalRooms}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary">
                  Available Rooms
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {availableRooms}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={() => setPage('Rooms')}
          >
            View Room Inventory
          </Button>

          <Button
            variant="outlined"
            onClick={() => setPage('Reservations')}
          >
            View Reservations
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
})()}

 {page==='Reservations' && <Card variant="outlined" sx={{borderRadius:3}}><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb:2}}><Typography variant="h6" fontWeight={750}>Reservations</Typography><Button variant="contained" startIcon={<Add/>} onClick={()=>setBookingOpen(true)} disabled={!hotels.length||!rooms.some(r=>r.status==='available')}>New booking</Button></Stack><BookingTable bookings={visibleBookings} onStatus={changeStatus} canManage={canManage}/></CardContent></Card>}
 {page==='Housekeeping' && <Card variant="outlined" sx={{borderRadius:3}}><CardContent><Typography variant="h6" fontWeight={750}>Housekeeping overview</Typography><Typography color="text.secondary" sx={{mt:1}}>Rooms marked as cleaning: {rooms.filter(r=>r.status==='cleaning').length}. Detailed task assignments are planned for the next iteration.</Typography><Table size="small" sx={{mt:2}}><TableHead><TableRow><TableCell>Room</TableCell><TableCell>Type</TableCell><TableCell>Status</TableCell><TableCell>Action</TableCell></TableRow></TableHead><TableBody>{rooms.map(r=><TableRow key={r._id}><TableCell>{r.roomNumber}</TableCell><TableCell>{r.type}</TableCell><TableCell>{r.status}</TableCell><TableCell><Button size="small" onClick={async()=>{try{await api.patch(`/rooms/${r._id}/status`,{status:r.status==='cleaning'?'available':'cleaning'});await refresh();setToast('Room status updated')}catch(e:any){setError(e?.response?.data?.error||'Update failed')}}}>{r.status==='cleaning'?'Mark clean':'Mark for cleaning'}</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}
 {page==='Analytics' && <Grid container spacing={2}>{[{label:'All reservations',value:summary?.totalBookings??bookings.length},{label:'Confirmed / completed',value:summary?.confirmedBookings??'—'},{label:'Paid revenue',value:money(summary?.revenue??0)},{label:'Total rooms',value:summary?.roomCount??rooms.length}].map(x=><Grid item xs={12} sm={6} key={x.label}><Card variant="outlined"><CardContent><Typography color="text.secondary">{x.label}</Typography><Typography variant="h4" fontWeight={800} sx={{mt:1}}>{x.value}</Typography></CardContent></Card></Grid>)}</Grid>}
 <Typography variant="caption" color="text.secondary" display="block" sx={{mt:4}}>HotelPro · Portfolio development · Payments are simulated and do not move money.</Typography></Container></Box>
 <Dialog open={bookingOpen} onClose={()=>setBookingOpen(false)} fullWidth maxWidth="sm"><Box component="form" onSubmit={makeBooking}><DialogTitle>Create reservation</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}><FormControl fullWidth><InputLabel>Room</InputLabel><Select<string> label="Room" value={form.roomId} onChange={e=>setForm({...form,roomId:e.target.value})} required>{rooms.filter(r=>r.status==='available').map(r=><MenuItem key={r._id} value={r._id}>Room {r.roomNumber} · {r.type} · {money(r.pricePerNight)}/night</MenuItem>)}</Select></FormControl><TextField label="Check-in" type="date" InputLabelProps={{shrink:true}} value={form.checkIn} onChange={e=>setForm({...form,checkIn:e.target.value})} required inputProps={{min:new Date().toISOString().slice(0,10)}}/><TextField label="Check-out" type="date" InputLabelProps={{shrink:true}} value={form.checkOut} onChange={e=>setForm({...form,checkOut:e.target.value})} required inputProps={{min:form.checkIn||new Date().toISOString().slice(0,10)}}/><TextField label="Guests" type="number" value={form.guests} onChange={e=>setForm({...form,guests:Number(e.target.value)})} inputProps={{min:1,max:12}} required/></Stack></DialogContent><DialogActions><Button onClick={()=>setBookingOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy?'Processing…':'Book & simulate payment'}</Button></DialogActions></Box></Dialog>
 <Dialog open={roomOpen} onClose={()=>setRoomOpen(false)} fullWidth maxWidth="sm"><Box component="form" onSubmit={addRoom}><DialogTitle>Add room</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}><TextField label="Room number" value={roomForm.roomNumber} onChange={e=>setRoomForm({...roomForm,roomNumber:e.target.value})} required/><FormControl fullWidth><InputLabel>Room type</InputLabel><Select<string> label="Room type" value={roomForm.type} onChange={e=>setRoomForm({...roomForm,type:e.target.value})}>{['Standard','Deluxe','Suite','Family'].map(x=><MenuItem key={x} value={x}>{x}</MenuItem>)}</Select></FormControl><TextField label="Capacity" type="number" value={roomForm.capacity} onChange={e=>setRoomForm({...roomForm,capacity:Number(e.target.value)})} required/><TextField label="Price per night (INR)" type="number" value={roomForm.pricePerNight} onChange={e=>setRoomForm({...roomForm,pricePerNight:Number(e.target.value)})} required/><TextField label="Description" value={roomForm.description} onChange={e=>setRoomForm({...roomForm,description:e.target.value})}/></Stack></DialogContent><DialogActions><Button onClick={()=>setRoomOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>Save room</Button></DialogActions></Box></Dialog>
 <Snackbar open={Boolean(toast)} autoHideDuration={5000} onClose={()=>setToast('')} message={toast}/></Box>;
}

function BookingTable({bookings,onStatus,canManage}:{bookings:BookingRecord[],onStatus:(id:string,status:string)=>void,canManage:boolean}) { return <Table size="small"><TableHead><TableRow><TableCell>Reference</TableCell><TableCell>Guest</TableCell><TableCell>Stay</TableCell><TableCell>Total</TableCell><TableCell>Status</TableCell>{canManage&&<TableCell>Actions</TableCell>}</TableRow></TableHead><TableBody>{bookings.map(b=><TableRow key={b._id}><TableCell><Typography fontWeight={700} variant="body2">{b.bookingCode}</Typography><Typography variant="caption" color="text.secondary">{typeof b.hotelId==='object'?b.hotelId.name:'Hotel'}</Typography></TableCell><TableCell>{typeof b.guestId==='object'?b.guestId.name:'Guest'}</TableCell><TableCell>{new Date(b.checkIn).toLocaleDateString()} – {new Date(b.checkOut).toLocaleDateString()}</TableCell><TableCell>{money(b.totalAmount)}</TableCell><TableCell><Stack spacing={.5} alignItems="flex-start"><Chip size="small" label={b.status.replace('_',' ')} color={b.status==='confirmed'?'success':b.status==='cancelled'?'error':'default'}/><Typography variant="caption" color="text.secondary">{b.paymentStatus}</Typography></Stack></TableCell>{canManage&&<TableCell><Stack direction="row" spacing={.5}>{b.status==='confirmed'&&<Button size="small" onClick={()=>onStatus(b._id,'checked_in')}>Check in</Button>}{b.status==='checked_in'&&<Button size="small" onClick={()=>onStatus(b._id,'checked_out')}>Check out</Button>}</Stack></TableCell>}</TableRow>)}</TableBody></Table>; }
